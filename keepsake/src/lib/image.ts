/**
 * Read an uploaded image File, downscale it to a sane max dimension, and
 * return a data URL plus its aspect ratio. Downscaling keeps local
 * persistence small and mobile memory use in check (a Bible risk note).
 */
export interface LoadedImage {
  src: string;
  /** natural width / height */
  aspect: number;
}

const MAX_DIM = 1400;

export function loadImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_DIM / Math.max(w, h));
      const outW = Math.max(1, Math.round(w * scale));
      const outH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, outW, outH);
      URL.revokeObjectURL(url);

      const isPng = file.type === "image/png";
      const src = canvas.toDataURL(
        isPng ? "image/png" : "image/jpeg",
        isPng ? undefined : 0.86,
      );
      resolve({ src, aspect: w / h || 1 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
