/**
 * Keepsake scan transfer, protocol 1: the encryption shared by the desktop receiver
 * (scanner-receiver.mjs) and its checks. KeepsakeScanner/ScanTransfer.swift is the
 * phone-side implementation and must produce identical bytes; the test vectors in
 * scripts/check-scanner-receiver.mjs pin both.
 *
 * Pairing: the receiver shows a 12-character code (60 bits, Crockford base32).
 * Both sides derive a 256-bit master key with PBKDF2-HMAC-SHA256(code, salt, iterations),
 * then two separate keys from it with HKDF-SHA256 (no salt): one for AES-GCM and one for
 * the receipt HMAC, so no key is used for two purposes.
 * The salt and a session id come from the receiver's GET /pairing; they are not
 * secret. The code never crosses the network.
 *
 * Upload body: MAGIC(4) || nonce(12) || ciphertext || tag(16), AES-256-GCM, with
 * additional data MAGIC || session id (UTF-8). This is exactly CryptoKit's
 * `AES.GCM.SealedBox.combined` after the 4-byte magic.
 * Plaintext: u32 little-endian header length || header JSON (UTF-8) || GLB.
 * Header: {v: 1, id: 32 lowercase hex characters, name: string, roomTheme: string}.
 */
import {createCipheriv, createDecipheriv, createHmac, hkdfSync, pbkdf2, pbkdf2Sync, randomBytes, randomInt} from 'node:crypto';

export const PROTOCOL = 1;
export const MAGIC = Buffer.from('KSE1', 'ascii');
export const CONTENT_TYPE = 'application/vnd.keepsake.scan-envelope';
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 12;
export const KDF = {algorithm: 'PBKDF2-SHA256', iterations: 600_000, saltBytes: 16, keyBytes: 32};
/** The phone refuses parameters outside these, so a fake receiver cannot weaken the key. */
export const KDF_LIMITS = {minIterations: 200_000, maxIterations: 5_000_000, minSaltBytes: 16, maxSaltBytes: 64};
export const NONCE_BYTES = 12;
export const TAG_BYTES = 16;
export const MAX_HEADER_BYTES = 2048;
export const ENVELOPE_OVERHEAD = MAGIC.length + NONCE_BYTES + TAG_BYTES + 4 + MAX_HEADER_BYTES;

/** A new random pairing code (no modulo bias: randomInt is uniform). */
export function newCode() {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** XXXX-XXXX-XXXX for display. */
export const formatCode = (code) => code.match(/.{1,4}/g).join('-');

/**
 * Accept what a person might type: any case, spaces or hyphens, and the letters
 * people confuse with digits (I and L for 1, O for 0). Anything else is refused.
 * Must match `PairingCode.normalize` in ScanTransfer.swift.
 */
export function normalizeCode(input) {
  const cleaned = String(input ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (cleaned.length !== CODE_LENGTH || [...cleaned].some((character) => !CODE_ALPHABET.includes(character))) throw new Error('The pairing code is 12 letters and numbers.');
  return cleaned;
}

export const KEY_INFO = {encrypt: 'keepsake-scan-v1 encrypt', receipt: 'keepsake-scan-v1 receipt'};

/** Split the PBKDF2 master key. Must match `ScanTransfer.keys(master:)` in Swift. */
export function splitKeys(master) {
  const derive = (info) => Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), Buffer.from(info, 'utf8'), 32));
  return {master, encrypt: derive(KEY_INFO.encrypt), receipt: derive(KEY_INFO.receipt)};
}

/** Keys for a pairing code: {master, encrypt, receipt}. */
export function deriveKey(code, salt, iterations = KDF.iterations) {
  return splitKeys(pbkdf2Sync(Buffer.from(normalizeCode(code), 'utf8'), salt, iterations, KDF.keyBytes, 'sha256'));
}

/** As deriveKey, without blocking the receiver while it stretches the code. */
export function deriveKeyAsync(code, salt, iterations = KDF.iterations) {
  return new Promise((resolve, reject) => pbkdf2(Buffer.from(normalizeCode(code), 'utf8'), salt, iterations, KDF.keyBytes, 'sha256', (error, master) => (error ? reject(error) : resolve(splitKeys(master)))));
}

const additionalData = (sessionId) => Buffer.concat([MAGIC, Buffer.from(sessionId, 'utf8')]);

/** Encrypt a scan the way the phone does. `nonce` is only fixed in test vectors. */
export function seal(keys, sessionId, header, glb, nonce = randomBytes(NONCE_BYTES)) {
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  if (headerBytes.length > MAX_HEADER_BYTES) throw new Error('Scan header is too long.');
  const length = Buffer.alloc(4); length.writeUInt32LE(headerBytes.length, 0);
  const cipher = createCipheriv('aes-256-gcm', keys.encrypt, nonce, {authTagLength: TAG_BYTES});
  cipher.setAAD(additionalData(sessionId));
  const ciphertext = Buffer.concat([cipher.update(Buffer.concat([length, headerBytes, glb])), cipher.final()]);
  return Buffer.concat([MAGIC, nonce, ciphertext, cipher.getAuthTag()]);
}

export class EnvelopeError extends Error {
  /** @param {'format'|'key'} kind format: malformed envelope; key: authentication failed */
  constructor(kind, message) { super(message); this.kind = kind; }
}

/** Decrypt and authenticate an upload. Throws EnvelopeError. */
export function open(keys, sessionId, body) {
  if (body.length < MAGIC.length + NONCE_BYTES + TAG_BYTES + 4 || !body.subarray(0, MAGIC.length).equals(MAGIC)) throw new EnvelopeError('format', 'This is not a Keepsake scan transfer.');
  const nonce = body.subarray(MAGIC.length, MAGIC.length + NONCE_BYTES);
  const tag = body.subarray(body.length - TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', keys.encrypt, nonce, {authTagLength: TAG_BYTES});
  decipher.setAAD(additionalData(sessionId));
  decipher.setAuthTag(tag);
  let plaintext;
  try { plaintext = Buffer.concat([decipher.update(body.subarray(MAGIC.length + NONCE_BYTES, body.length - TAG_BYTES)), decipher.final()]); }
  catch { throw new EnvelopeError('key', 'The scan could not be unlocked with this pairing code.'); }
  // Authenticated from here on: only someone with the code produced these bytes.
  const headerLength = plaintext.readUInt32LE(0);
  if (headerLength > MAX_HEADER_BYTES || 4 + headerLength > plaintext.length) throw new EnvelopeError('format', 'The scan header is invalid.');
  let header;
  try { header = JSON.parse(plaintext.subarray(4, 4 + headerLength).toString('utf8')); } catch { throw new EnvelopeError('format', 'The scan header is invalid.'); }
  if (!header || header.v !== PROTOCOL || typeof header.id !== 'string' || !/^[0-9a-f]{32}$/.test(header.id)) throw new EnvelopeError('format', 'The scan header is invalid.');
  return {header, glb: plaintext.subarray(4 + headerLength)};
}

/** Proof for the phone that the scan reached the receiver that knows the code. */
export function receipt(keys, id) {
  return createHmac('sha256', keys.receipt).update(`keepsake-receipt:${id}`, 'utf8').digest('base64');
}
