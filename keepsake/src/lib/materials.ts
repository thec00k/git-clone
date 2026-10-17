export const STICKER_FINISHES = {
  matte: 'Matte paper',
  glossy: 'Glossy vinyl',
  holographic: 'Holographic',
  glitter: 'Glitter',
} as const;
export type StickerFinish = keyof typeof STICKER_FINISHES;
export const isStickerFinish = (v: unknown): v is StickerFinish =>
  typeof v === 'string' && Object.hasOwn(STICKER_FINISHES, v);
export const PAPER_MATERIALS = {
  cream: {
    name: 'Warm cream',
    color: '#F5EBD6',
    shadow: '#C9BDA1',
    seed: 4,
    roughness: 0.24,
    fiber: 0.18,
    folds: 0.04,
    wrinkles: 0.15,
    grainSize: 0.35,
    fiberSize: 0.35,
    wrinkleSize: 0.6,
    drops: 0.035,
  },
  cotton: {
    name: 'Handmade cotton',
    color: '#F1EFE7',
    shadow: '#BAB9A6',
    seed: 17,
    roughness: 0.34,
    fiber: 0.6,
    folds: 0.025,
    wrinkles: 0.24,
    grainSize: 0.46,
    fiberSize: 0.55,
    wrinkleSize: 0.42,
    drops: 0.06,
  },
  journal: {
    name: 'Creased journal',
    color: '#E6D5B3',
    shadow: '#B5A17D',
    seed: 29,
    roughness: 0.26,
    fiber: 0.24,
    folds: 0.22,
    wrinkles: 0.48,
    grainSize: 0.4,
    fiberSize: 0.4,
    wrinkleSize: 0.72,
    drops: 0.09,
  },
} as const;
export type PaperMaterial = keyof typeof PAPER_MATERIALS;
export interface PaperSettings {
  material: PaperMaterial;
  texture: number;
  wrinkles: number;
}
export const isPaperMaterial = (v: unknown): v is PaperMaterial =>
  typeof v === 'string' && Object.hasOwn(PAPER_MATERIALS, v);
export const unitAmount = (v: unknown, fallback = 0.5): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
export function paperSettings(v?: Partial<PaperSettings>): PaperSettings {
  return {
    material: isPaperMaterial(v?.material) ? v.material : 'cream',
    texture: unitAmount(v?.texture),
    wrinkles: unitAmount(v?.wrinkles),
  };
}
export function validPaperSettings(v: unknown): v is PaperSettings {
  if (!v || typeof v !== 'object') return false;
  const p = v as PaperSettings;
  return (
    isPaperMaterial(p.material) &&
    [p.texture, p.wrinkles].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
  );
}
