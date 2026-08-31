/*
 * Layout presets — "presets for fast users and freeform placement for users
 * who enjoy craft" (Bible §5). Each preset returns, in order, a placement for
 * every photo on a page: center x/y and width as percentages, plus rotation.
 */
export type LayoutPreset = "grid" | "column" | "scatter";

export interface Placement {
  x: number;
  y: number;
  w: number;
  rot: number;
}

export function computeLayout(preset: LayoutPreset, n: number): Placement[] {
  if (n <= 0) return [];
  if (preset === "column") return columnLayout(n);
  if (preset === "scatter") return scatterLayout(n);
  return gridLayout(n);
}

function gridLayout(n: number): Placement[] {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const margin = 12;
  const areaW = 100 - margin * 2;
  const areaH = 100 - margin * 2;
  const cellW = areaW / cols;
  const cellH = areaH / rows;

  const out: Placement[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const colInRow = i % cols;
    const countInRow = Math.min(cols, n - row * cols);
    const rowWidth = countInRow * cellW;
    const startX = margin + (areaW - rowWidth) / 2;
    out.push({
      x: startX + cellW * (colInRow + 0.5),
      y: margin + cellH * (row + 0.5),
      w: cellW * 0.82,
      rot: 0,
    });
  }
  return out;
}

function columnLayout(n: number): Placement[] {
  const margin = 14;
  const out: Placement[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: 50,
      y: margin + (100 - margin * 2) * ((i + 0.5) / n),
      w: 54,
      rot: i % 2 === 0 ? -3 : 3,
    });
  }
  return out;
}

function scatterLayout(n: number): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: 28 + ((i * 53) % 40),
      y: 30 + ((i * 29) % 40),
      w: 44,
      rot: (i % 2 === 0 ? -1 : 1) * (4 + (i % 3) * 2),
    });
  }
  return out;
}
