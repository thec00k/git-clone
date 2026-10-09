import Foundation
import CryptoKit
import CommonCrypto

/// Keepsake scan transfer, protocol 1 (phone side).
///
/// Must stay byte-compatible with `scripts/scan-envelope.mjs`. `selfTest()` checks the
/// shared test vectors from `scripts/check-scanner-receiver.mjs` in DEBUG builds.
///
/// The pairing code typed here never leaves the phone. It is stretched into a master key
/// with PBKDF2-HMAC-SHA256 using the receiver's public salt, then split with HKDF-SHA256 into
/// an AES-GCM key and a receipt key. The scan is sealed before it is sent, so nobody else
/// on the network can read or replace it.
enum PairingCode {
    static let alphabet: Set<Character> = Set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
    static let length = 12

    /// Accepts any case, spaces and hyphens; reads I and L as 1 and O as 0.
    /// Returns nil for anything that is not a 12-character code.
    static func normalize(_ input: String) -> String? {
        var output = ""
        for character in input.uppercased() {
            if character == "-" || character.isWhitespace { continue }
            let mapped: Character = (character == "I" || character == "L") ? "1" : (character == "O" ? "0" : character)
            guard alphabet.contains(mapped) else { return nil }
            output.append(mapped)
        }
        return output.count == length ? output : nil
    }
}

enum ScanTransferError: LocalizedError, Equatable {
    case badAddress, badCode, incompatibleReceiver, wrongCode, pairingEnded, alreadySent, notConfirmed
    case refused(String), unreachable(String)

    var errorDescription: String? {
        switch self {
        case .badAddress: "Enter the address shown on the computer, such as 192.168.1.20:4318."
        case .badCode: "The pairing code is 12 letters and numbers, shown on the computer."
        case .incompatibleReceiver: "This computer is running a different version of the Keepsake receiver. Update Keepsake on the computer."
        case .wrongCode: "That pairing code does not match. Check the code shown on the computer."
        case .pairingEnded: "The computer now shows a new pairing code. Enter the new code and try again."
        case .alreadySent: "This scan was already received."
        case .notConfirmed: "The computer did not confirm the scan. Make sure you entered your own computer’s address."
        case .refused(let reason): reason
        case .unreachable(let reason): "Could not reach the computer: \(reason)"
        }
    }
}

enum ScanTransfer {
    static let protocolVersion = 1
    static let magic = Data("KSE1".utf8)
    static let contentType = "application/vnd.keepsake.scan-envelope"
    /// A receiver offering weaker settings than these is refused, so a look-alike
    /// receiver cannot make the code easier to guess from what it collects.
    static let iterationRange = 200_000...5_000_000
    static let saltLengthRange = 16...64
    static let maxHeaderBytes = 2048

    struct Header: Encodable { let id: String; let name: String; let roomTheme: String; let v: Int }
    struct Keys { let encrypt: SymmetricKey; let receipt: SymmetricKey }

    /// Must match `splitKeys` in scripts/scan-envelope.mjs (HKDF-SHA256, no salt).
    static func keys(master: SymmetricKey) -> Keys {
        func derive(_ info: String) -> SymmetricKey { HKDF<SHA256>.deriveKey(inputKeyMaterial: master, info: Data(info.utf8), outputByteCount: 32) }
        return Keys(encrypt: derive("keepsake-scan-v1 encrypt"), receipt: derive("keepsake-scan-v1 receipt"))
    }

    private struct Pairing: Decodable {
        struct KDF: Decodable { let alg: String; let iterations: Int; let salt: String }
        let v: Int; let session: String; let kdf: KDF
    }
    private struct Reply: Decodable { let receipt: String?; let error: String? }

    /// No cache, cookies or credentials: the transfer leaves nothing behind on the phone.
    private static let session = URLSession(configuration: .ephemeral)

    static func receiverURL(_ typed: String) -> URL? {
        var text = typed.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.contains("://") { text = "http://" + text }
        guard let url = URL(string: text), let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https", let host = url.host, !host.isEmpty else { return nil }
        return url
    }

    static func deriveKey(code: String, salt: Data, iterations: Int) throws -> SymmetricKey {
        let password = Array(code.utf8).map { CChar(bitPattern: $0) }
        var derived = [UInt8](repeating: 0, count: 32)
        let status = salt.withUnsafeBytes { (saltBytes: UnsafeRawBufferPointer) -> Int32 in
            CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2), password, password.count,
                                 saltBytes.bindMemory(to: UInt8.self).baseAddress, salt.count,
                                 CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(iterations),
                                 &derived, derived.count)
        }
        guard status == Int32(kCCSuccess) else { throw ScanTransferError.incompatibleReceiver }
        return SymmetricKey(data: derived)
    }

    /// MAGIC || nonce || ciphertext || tag, with MAGIC || session id as additional data.
    static func seal(glb: Data, header: Header, sessionId: String, keys: Keys, nonce: AES.GCM.Nonce = AES.GCM.Nonce()) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let headerData = try encoder.encode(header)
        guard headerData.count <= maxHeaderBytes else { throw ScanTransferError.refused("The scan name is too long.") }
        var length = UInt32(headerData.count).littleEndian
        var plaintext = Data(bytes: &length, count: 4)
        plaintext.append(headerData)
        plaintext.append(glb)
        let box = try AES.GCM.seal(plaintext, using: keys.encrypt, nonce: nonce, authenticating: magic + Data(sessionId.utf8))
        guard let combined = box.combined else { throw ScanTransferError.refused("The scan could not be encrypted.") }
        return magic + combined
    }

    static func receiptIsValid(_ receipt: String, id: String, keys: Keys) -> Bool {
        guard let code = Data(base64Encoded: receipt) else { return false }
        return HMAC<SHA256>.isValidAuthenticationCode(code, authenticating: Data("keepsake-receipt:\(id)".utf8), using: keys.receipt)
    }

    /// Pair, encrypt and send one scan. Returns once the receiver has confirmed it.
    static func send(file: URL, name: String, roomTheme: String, address: String, code typed: String) async throws {
        guard let base = receiverURL(address) else { throw ScanTransferError.badAddress }
        guard let code = PairingCode.normalize(typed) else { throw ScanTransferError.badCode }

        let pairing: Pairing
        do {
            var request = URLRequest(url: base.appendingPathComponent("pairing")); request.timeoutInterval = 10
            let (data, response) = try await session.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw ScanTransferError.incompatibleReceiver }
            pairing = try JSONDecoder().decode(Pairing.self, from: data)
        } catch let error as ScanTransferError { throw error
        } catch is DecodingError { throw ScanTransferError.incompatibleReceiver
        } catch { throw ScanTransferError.unreachable(error.localizedDescription) }

        guard pairing.v == protocolVersion, pairing.kdf.alg == "PBKDF2-SHA256", iterationRange.contains(pairing.kdf.iterations),
              let salt = Data(base64Encoded: pairing.kdf.salt), saltLengthRange.contains(salt.count),
              pairing.session.range(of: "^[0-9a-f]{32}$", options: .regularExpression) != nil
        else { throw ScanTransferError.incompatibleReceiver }

        // Deliberately slow (about half a second): keep it off the main thread.
        let iterations = pairing.kdf.iterations
        let keys = try await Task.detached(priority: .userInitiated) { () throws -> Keys in
            let master = try ScanTransfer.deriveKey(code: code, salt: salt, iterations: iterations)
            return ScanTransfer.keys(master: master)
        }.value
        let glb = try Data(contentsOf: file)
        let id = (0..<16).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
        let body = try seal(glb: glb, header: Header(id: id, name: String(name.prefix(80)), roomTheme: roomTheme, v: protocolVersion), sessionId: pairing.session, keys: keys)

        var upload = URLRequest(url: base.appendingPathComponent("upload"))
        upload.httpMethod = "POST"; upload.timeoutInterval = 60
        upload.setValue(contentType, forHTTPHeaderField: "Content-Type")
        upload.setValue(pairing.session, forHTTPHeaderField: "X-Keepsake-Session")
        let result: (Data, URLResponse)
        do { result = try await session.upload(for: upload, from: body) }
        catch { throw ScanTransferError.unreachable(error.localizedDescription) }
        let (data, response) = result
        let reply = try? JSONDecoder().decode(Reply.self, from: data)
        switch (response as? HTTPURLResponse)?.statusCode ?? 0 {
        case 201:
            guard let receipt = reply?.receipt, receiptIsValid(receipt, id: id, keys: keys) else { throw ScanTransferError.notConfirmed }
        case 401: throw ScanTransferError.wrongCode
        case 409: throw ScanTransferError.alreadySent
        case 410: throw ScanTransferError.pairingEnded
        case 426: throw ScanTransferError.incompatibleReceiver
        case 503: throw ScanTransferError.refused(reply?.error ?? "The computer is busy. Try again in a moment.")
        default: throw ScanTransferError.refused(reply?.error ?? "The computer did not accept this scan.")
        }
    }

    #if DEBUG
    /// Checks this implementation against the receiver's test vectors
    /// (scripts/check-scanner-receiver.mjs). Run once at launch in DEBUG builds.
    static func selfTest() {
        func hex<D: Sequence>(_ bytes: D) -> String where D.Element == UInt8 { bytes.map { String(format: "%02x", $0) }.joined() }
        guard let code = PairingCode.normalize("k7qf-m2xd-9pl0"), code == "K7QFM2XD9P10" else { return assertionFailure("PairingCode.normalize does not match the receiver") }
        do {
            let master = try deriveKey(code: code, salt: Data((0..<16).map { UInt8($0) }), iterations: 600_000)
            assert(master.withUnsafeBytes { hex($0) } == "04f0ce7ddc7a65a657999f387db525e7e482d2fbfdd7743761b44e708eafb506", "PBKDF2 does not match the receiver")
            let keys = ScanTransfer.keys(master: master)
            assert(keys.encrypt.withUnsafeBytes { hex($0) } == "ddcff700f153d0facfc594b1c9382a3fe8bf7a7f4ca2a9c626fc32cceaae9524", "HKDF encryption key does not match the receiver")
            assert(keys.receipt.withUnsafeBytes { hex($0) } == "dcfce0f14f0cc5fce4f132fe3f2c3b3cbeaaed4200f438ad146a850143fcce9e", "HKDF receipt key does not match the receiver")
            let envelope = try seal(glb: Data("keepsake test vector".utf8),
                                    header: Header(id: "00112233445566778899aabbccddeeff", name: "mug", roomTheme: "woodland", v: 1),
                                    sessionId: "0123456789abcdef0123456789abcdef", keys: keys,
                                    nonce: try AES.GCM.Nonce(data: Data((0..<12).map { UInt8($0) })))
            assert(hex(SHA256.hash(data: envelope)) == "16225e750e535f85c2460f93a34295c3d0ddf432baa27d4adf3e3b18c35dc5c9", "Envelope does not match the receiver")
            assert(receiptIsValid("oI6PVnrQ4kxQ31b6UjbOXPxrVKa+UUdt3H/6bqJu4BM=", id: "00112233445566778899aabbccddeeff", keys: keys), "Receipt does not match the receiver")
            print("ScanTransfer self-test passed")
        } catch { assertionFailure("ScanTransfer self-test failed: \(error)") }
    }
    #endif
}
