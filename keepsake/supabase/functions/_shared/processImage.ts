/**
 * Upload image processing, shared by the edge function (Deno) and its test (Node): read the size from the
 * file header, refuse anything too large to decode safely, then decode, turn upright, shrink to at most
 * 2048 px on the longest edge and re-encode as WebP. Re-encoding from pixels keeps no EXIF, GPS or other
 * metadata. The image library is passed in (magick-wasm; see magickLib) so this file has no imports: the
 * edge runtime only runs WebAssembly libraries, never native ones such as imagescript's codecs or sharp.
 */
export const MAX_EDGE = 2048;
/** Larger images are refused before decoding: decoding one would need gigabytes of memory. */
export const MAX_PIXELS = 50_000_000;
export const WEBP_QUALITY = 86;

export class UnsupportedImage extends Error {}

export interface ImageLib {
  /** One pass: decode, turn upright, drop metadata, resize to fit(width, height), encode WebP. */
  toWebp(
    raw: Uint8Array,
    fit: (width: number, height: number) => {width: number; height: number},
    quality: number,
  ): Promise<{webp: Uint8Array<ArrayBuffer>; width: number; height: number}>;
}

/** The parts of @imagemagick/magick-wasm used here, so this file needs no import of it. */
interface Magick {
  ImageMagick: {read<T>(data: Uint8Array, settings: unknown, func: (image: MagickImage) => T): T};
  MagickReadSettings: new () => {setDefine(format: string, name: string, value: string): void};
  MagickGeometry: new (width: number, height: number) => {ignoreAspectRatio: boolean};
  MagickFormat: {Jpeg: string; WebP: string};
  FilterType: {Triangle: number};
}
interface MagickImage {
  width: number;
  height: number;
  quality: number;
  filterType: number;
  settings: {setDefine(format: string, name: string, value: string): void};
  autoOrient(): void;
  strip(): void;
  resize(geometry: unknown): void;
  write<T>(format: string, func: (data: Uint8Array<ArrayBuffer>) => T): T;
}

/** magick-wasm (already initialised) as an ImageLib. Settings keep a 12 MP photo under about 1 s of CPU,
 * inside the edge function's limit: JPEGs decode straight to near the target size, a triangle filter
 * resizes, and WebP uses a fast encoder method. */
export function magickLib(m: Magick): ImageLib {
  return {
    async toWebp(raw, fit, quality) {
      const settings = new m.MagickReadSettings();
      settings.setDefine(m.MagickFormat.Jpeg, 'size', `${MAX_EDGE}x${MAX_EDGE}`);
      return m.ImageMagick.read(raw, settings, image => {
        image.autoOrient(); // phones store sideways pixels plus a turn-me tag that strip() removes
        image.strip();
        const size = fit(image.width, image.height);
        if (size.width !== image.width || size.height !== image.height) {
          const geometry = new m.MagickGeometry(size.width, size.height);
          geometry.ignoreAspectRatio = true;
          image.filterType = m.FilterType.Triangle;
          image.resize(geometry);
        }
        image.quality = quality;
        image.settings.setDefine(m.MagickFormat.WebP, 'method', '1');
        return image.write(m.MagickFormat.WebP, data => ({
          webp: data.slice(),
          width: image.width,
          height: image.height,
        }));
      });
    },
  };
}

/** Width and height from a PNG or JPEG header, or null for any other format. */
export function headerSize(b: Uint8Array): {type: 'png' | 'jpeg'; width: number; height: number} | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return {type: 'png', width: v.getUint32(16), height: v.getUint32(20)};
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xff) {
        i++; // padding
        continue;
      }
      const length = (b[i + 2] << 8) | b[i + 3];
      // SOF0-SOF15 hold the frame size (C4 DHT, C8 JPG and CC DAC are not frames).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
        return {type: 'jpeg', height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8]};
      i += 2 + length;
    }
  }
  return null;
}

export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  if (width <= max && height <= max) return {width, height};
  const scale = max / Math.max(width, height);
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}

export async function toWebp(raw: Uint8Array, lib: ImageLib) {
  const header = headerSize(raw);
  if (!header) throw new UnsupportedImage('Only JPEG and PNG photos can be backed up for now.');
  if (!header.width || !header.height || header.width * header.height > MAX_PIXELS)
    throw new UnsupportedImage('This photo is too large to process.');
  try {
    return await lib.toWebp(raw, fitWithin, WEBP_QUALITY);
  } catch {
    throw new UnsupportedImage('This photo could not be read.');
  }
}
