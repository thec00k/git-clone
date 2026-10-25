/** Downscale user images before storing them. */
import {preserveOriginal, type OriginalPhoto} from './originalPhotos.ts';
export interface LoadedImage {
  src: string;
  aspect: number;
  original?: OriginalPhoto;
}
export async function loadImageFile(file: File, keepOriginal = true): Promise<LoadedImage> {
  if (file.size > 25 * 1024 * 1024)
    return Promise.reject(new Error('This image exceeds the 25 MB file limit.'));
  if (file.type === 'image/gif' && file.size > 8 * 1024 * 1024)
    return Promise.reject(new Error('Animated GIF cards must be 8 MB or smaller.'));
  let image: LoadedImage;
  try {
    image = await decodeImage(file);
  } catch (error) {
    // Chrome, Edge and Firefox cannot open HEIC (iPhone photos copied to a computer); convert those in the
    // browser. The converter only downloads the first time someone picks a HEIC photo.
    if (!isHeic(file)) throw error;
    image = await decodeImage(await heicToJpeg(file));
  }
  // A GIF is already retained byte-for-byte as the displayed card. Avoid
  // storing a second identical copy in the originals database.
  return keepOriginal && file.type !== 'image/gif'
    ? {...image, original: await preserveOriginal(file)}
    : image;
}
const isHeic = (file: File) => /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
async function heicToJpeg(file: File) {
  const {default: heic2any} = await import('heic2any');
  const converted = await heic2any({blob: file, toType: 'image/jpeg', quality: 0.92}).catch(() => {
    throw new Error('This HEIC photo could not be converted. Export it as JPEG.');
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), {type: 'image/jpeg'});
}
function decodeImage(file: File) {
  return new Promise<LoadedImage>((resolve, reject) => {
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      try {
        const {naturalWidth: w, naturalHeight: h} = img;
        if (!w || !h || w * h > 50_000_000) throw new Error('Choose an image smaller than 50 megapixels.');
        if (file.type === 'image/gif') {
          const reader = new FileReader();
          reader.onload = () => resolve({src: String(reader.result), aspect: w / h});
          reader.onerror = () => reject(new Error('Could not read animated GIF.'));
          reader.readAsDataURL(file);
          return;
        }
        const scale = Math.min(1, 1400 / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Image processing is unavailable.');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86);
        if (src === 'data:,') throw new Error('This image could not be processed.');
        resolve({src, aspect: w / h});
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}
