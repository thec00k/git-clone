/**
 * Removes location and other embedded metadata from an original photo before it is kept or backed up
 * (owner decision: location data is stripped). JPEG: drops APP1 (EXIF/XMP) and APP13 (IPTC) but keeps a
 * minimal EXIF orientation so the photo still displays upright. PNG: drops eXIf and text chunks. WebP: drops
 * EXIF/XMP chunks. Other formats are returned unchanged. Pure byte work, so it runs in Node tests too.
 */
function u16(b: Uint8Array, i: number, le: boolean) { return le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]; }
function u32(b: Uint8Array, i: number, le: boolean) { return le ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0 : ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }
function exifOrientation(seg: Uint8Array): number {
  // seg starts after the 2-byte length: "Exif\0\0" then TIFF header
  if (seg.length < 14 || String.fromCharCode(...seg.subarray(0, 4)) !== 'Exif') return 1;
  const t = seg.subarray(6), le = t[0] === 0x49;
  const ifd = u32(t, 4, le); if (ifd + 2 > t.length) return 1;
  const n = u16(t, ifd, le);
  for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (e + 12 > t.length) break; if (u16(t, e, le) === 0x0112) { const v = u16(t, e + 8, le); return v >= 1 && v <= 8 ? v : 1; } }
  return 1;
}
function orientationApp1(o: number): Uint8Array {
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0, 0, 0, 0, 0];
  const len = body.length + 2; return Uint8Array.from([0xff, 0xe1, len >> 8, len & 255, ...body]);
}
export function stripJpeg(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xff || b[1] !== 0xd8) return b;
  const out: Uint8Array[] = [b.subarray(0, 2)]; let i = 2, orientation = 1, scan = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b; // not a marker where one should be: leave the file alone
    const marker = b[i + 1];
    if (marker === 0xda) { out.splice(1, 0, ...(orientation !== 1 ? [orientationApp1(orientation)] : [])); out.push(b.subarray(i)); scan = true; break; }
    const len = u16(b, i + 2, false); if (len < 2 || i + 2 + len > b.length) return b;
    const seg = b.subarray(i, i + 2 + len);
    if (marker === 0xe1) { const o = exifOrientation(seg.subarray(4)); if (o !== 1) orientation = o; }
    else if (marker !== 0xed) out.push(seg);
    i += 2 + len;
  }
  if (!scan) return b;
  const size = out.reduce((n, p) => n + p.length, 0), r = new Uint8Array(size); let o = 0; for (const p of out) { r.set(p, o); o += p.length; } return r;
}
export function stripPng(b: Uint8Array): Uint8Array {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]; if (!sig.every((v, i) => b[i] === v)) return b;
  const drop = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt']); const out: Uint8Array[] = [b.subarray(0, 8)]; let i = 8;
  while (i + 12 <= b.length) { const len = u32(b, i, false), type = String.fromCharCode(...b.subarray(i + 4, i + 8)), end = i + 12 + len; if (end > b.length) return b; if (!drop.has(type)) out.push(b.subarray(i, end)); i = end; if (type === 'IEND') break; }
  const r = new Uint8Array(out.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of out) { r.set(p, o); o += p.length; } return r;
}
export function stripWebp(b: Uint8Array): Uint8Array {
  if (String.fromCharCode(...b.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...b.subarray(8, 12)) !== 'WEBP') return b;
  const out: Uint8Array[] = []; let i = 12;
  while (i + 8 <= b.length) { const type = String.fromCharCode(...b.subarray(i, i + 4)), len = u32(b, i + 4, true), end = i + 8 + len + (len & 1); if (end > b.length) return b;
    if (type !== 'EXIF' && type !== 'XMP ') { const chunk = b.slice(i, end); if (type === 'VP8X') chunk[8] &= ~0x0c; out.push(chunk); } i = end; }
  const body = out.reduce((n, p) => n + p.length, 0), r = new Uint8Array(12 + body); r.set(b.subarray(0, 12)); const size = 4 + body;
  r[4] = size & 255; r[5] = (size >> 8) & 255; r[6] = (size >> 16) & 255; r[7] = (size >>> 24) & 255; let o = 12; for (const p of out) { r.set(p, o); o += p.length; } return r;
}
export function stripMetadataBytes(b: Uint8Array): Uint8Array { return stripPng(stripWebp(stripJpeg(b))); }
export async function stripMetadata(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer()), clean = stripMetadataBytes(bytes);
  return clean === bytes ? file : new File([clean as BlobPart], file.name, {type: file.type, lastModified: file.lastModified});
}
