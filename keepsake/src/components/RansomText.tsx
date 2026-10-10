import type {CSSProperties} from 'react';
/** Magazine-cutout lettering: every letter is its own little paper scrap. Deterministic (same text, same look) so it never reshuffles on edit or reload. */
const FONTS = [
  {f: 'var(--font-display)', w: 900, i: false}, {f: 'var(--font-display)', w: 700, i: true},
  {f: 'Inter, sans-serif', w: 800, i: false}, {f: 'Inter, sans-serif', w: 400, i: false},
  {f: 'Georgia, "Times New Roman", serif', w: 700, i: false}, {f: '"Courier New", monospace', w: 700, i: false},
  {f: 'var(--font-script)', w: 700, i: false}, {f: 'Impact, "Arial Narrow", sans-serif', w: 400, i: false},
];
// paper, ink: newsprint, glossy white, kraft, and a few magazine-ad colours
const SCRAPS = [
  ['#f4efe2', '#1c1a17'], ['#ffffff', '#c0332b'], ['#1c1a17', '#f4efe2'], ['#f2d64b', '#1c1a17'],
  ['#d9e8f2', '#1d3a5c'], ['#e9c6cf', '#4a1730'], ['#cfe3c9', '#1e4228'], ['#e3d3b4', '#3a2a14'],
  ['#c0332b', '#fff6e6'], ['#fff6e6', '#1c1a17'],
] as const;
function hash(n: number) { n = Math.imul(n ^ (n >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function scrap(char: string, index: number): CSSProperties {
  const h = (k: number) => hash(char.charCodeAt(0) * 131 + index * 977 + k * 7919);
  const font = FONTS[Math.floor(h(1) * FONTS.length)], [paper, ink] = SCRAPS[Math.floor(h(2) * SCRAPS.length)];
  const j = (k: number, a: number) => `${(h(k) * a).toFixed(1)}%`; // torn corners
  return {
    fontFamily: font.f, fontWeight: font.w, fontStyle: font.i ? 'italic' : 'normal', color: ink, background: paper,
    textTransform: h(3) > .5 ? 'uppercase' : 'none', fontSize: `${(.82 + h(4) * .4).toFixed(2)}em`,
    transform: `rotate(${((h(5) - .5) * 9).toFixed(1)}deg) translateY(${((h(6) - .5) * .14).toFixed(2)}em)`,
    clipPath: `polygon(${j(7, 7)} ${j(8, 9)}, ${100 - h(9) * 6}% ${j(10, 6)}, ${100 - h(11) * 7}% ${100 - h(12) * 8}%, ${j(13, 6)} ${100 - h(14) * 7}%)`,
  };
}
export function RansomText({text}: {text: string}) {
  let n = 0;
  return <span className="ks-ransom" aria-label={text}>{text.split(/(\s+)/).map((word, w) => /^\s+$/.test(word)
    ? <span key={w} className="ks-ransom-gap"> </span>
    : <span key={w} className="ks-ransom-word" aria-hidden="true">{[...word].map(ch => <span key={n} className="ks-ransom-scrap" style={scrap(ch, n++)}>{ch}</span>)}</span>)}</span>;
}
