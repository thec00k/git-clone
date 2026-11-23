// Standalone design preview: a paper "spill" dropdown and a petal colour picker.
// Written from scratch for Keepsake (no third-party component code). Not wired
// into scrapbook data, the editor, or the photo review stack.
import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SHARPIE_COLORS} from '../types/scrapbook';
import '../fonts.css';
import './paper-controls-preview.css';

// Shared SVG filters: a "goo" merge that keeps paper crisp, and a rough
// hand-cut edge with an ink outline.
function PaperFilters() {
  return (
    <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden="true">
      <defs>
        <filter id="ks-paper-goo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" result="body" />
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap
            in="body"
            in2="noise"
            scale="3.5"
            xChannelSelector="R"
            yChannelSelector="G"
            result="cut"
          />
          <feMorphology in="cut" operator="dilate" radius="1.1" result="thick" />
          <feFlood floodColor="#3a2e22" result="ink" />
          <feComposite in="ink" in2="thick" operator="in" result="outline" />
          <feGaussianBlur in="thick" stdDeviation="3" result="soft" />
          <feOffset in="soft" dy="4" result="drop" />
          <feFlood floodColor="#5a4228" floodOpacity="0.28" />
          <feComposite in2="drop" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="outline" />
            <feMergeNode in="cut" />
          </feMerge>
        </filter>
        <filter id="ks-paper-cut" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <pattern id="ks-paper-grain" patternUnits="userSpaceOnUse" width="220" height="220">
          <image
            href="/textures/paper-warm-cream.webp"
            width="220"
            height="220"
            preserveAspectRatio="xMidYMid slice"
          />
        </pattern>
      </defs>
    </svg>
  );
}

const PAPERS = [
  {id: 'cream', label: 'Warm cream', swatch: '#F5EBD6'},
  {id: 'cotton', label: 'Handmade cotton', swatch: '#F3F0E6'},
  {id: 'journal', label: 'Creased journal', swatch: '#E8D9B8'},
  {id: 'kraft', label: 'Brown kraft', swatch: '#C9A57A'},
];

export function PaperSpillDropdown({label = 'Page paper'}: {label?: string}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(PAPERS[0].id);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const current = PAPERS.find(p => p.id === value)!;
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [open]);
  const choose = (id: string) => {
    setValue(id);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive(a => (a + (e.key === 'ArrowDown' ? 1 : PAPERS.length - 1)) % PAPERS.length);
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault();
      choose(PAPERS[active].id);
    }
  };
  return (
    <div ref={root} className={`ks-spill ${open ? 'is-open' : ''}`} onKeyDown={onKey}>
      {/* Paper blobs: one filtered layer so the slips melt out of the tag. */}
      <div className="ks-spill-paper" aria-hidden="true">
        <span className="ks-spill-blob ks-spill-tag" />
        {PAPERS.map((p, i) => (
          <span
            key={p.id}
            className="ks-spill-blob ks-spill-slip"
            style={{'--i': i} as React.CSSProperties}
          />
        ))}
      </div>
      <button
        type="button"
        className="ks-spill-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <small>{label}</small>
        <span>
          <i style={{background: current.swatch}} />
          {current.label}
        </span>
        <svg className="ks-spill-caret" viewBox="0 0 16 10" aria-hidden="true">
          <path d="M2 2.5 C5 5, 6.5 7, 8 8 C10 6, 12 4, 14 2" />
        </svg>
      </button>
      <ul role="listbox" aria-label={label} className="ks-spill-options">
        {PAPERS.map((p, i) => (
          <li
            key={p.id}
            role="option"
            aria-selected={p.id === value}
            tabIndex={-1}
            className={i === active ? 'is-active' : ''}
            style={{'--i': i} as React.CSSProperties}
            onPointerEnter={() => setActive(i)}
            onClick={() => choose(p.id)}
          >
            <i style={{background: p.swatch}} />
            {p.label}
            {p.id === value && (
              <svg viewBox="0 0 20 16" aria-hidden="true">
                <path d="M2 9 C4 10, 6 12, 7.5 14 C10 9, 13 5, 18 2" />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const INKS = [
  {hex: SHARPIE_COLORS[0], name: 'Fountain ink'},
  {hex: SHARPIE_COLORS[1], name: 'Cherry red'},
  {hex: SHARPIE_COLORS[2], name: 'Navy'},
  {hex: SHARPIE_COLORS[3], name: 'Forest'},
  {hex: SHARPIE_COLORS[4], name: 'Terracotta'},
  {hex: '#c9973a', name: 'Mustard'},
  {hex: '#8a9a6b', name: 'Sage'},
  {hex: '#c98b84', name: 'Dusty rose'},
];
const PETAL = 'M0 -14 C-17 -26, -19 -54, 0 -70 C19 -54, 17 -26, 0 -14 Z';

export function PetalInkPicker() {
  const [open, setOpen] = useState(false);
  const [ink, setInk] = useState(INKS[0]);
  const [hover, setHover] = useState<string | null>(null);
  const shown = INKS.find(i => i.hex === hover) ?? ink;
  return (
    <div
      className={`ks-petals ${open ? 'is-open' : ''}`}
      onKeyDown={e => e.key === 'Escape' && setOpen(false)}
    >
      <svg viewBox="-100 -100 200 200" role="group" aria-label="Ink colour">
        <g filter="url(#ks-paper-cut)">
          {INKS.map((c, i) => (
            <g
              key={c.hex}
              className="ks-petal"
              style={{'--a': `${(360 / INKS.length) * i}deg`, '--i': i} as React.CSSProperties}
              role="button"
              tabIndex={open ? 0 : -1}
              aria-label={c.name}
              aria-pressed={c.hex === ink.hex}
              onPointerEnter={() => setHover(c.hex)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(c.hex)}
              onBlur={() => setHover(null)}
              onClick={() => {
                setInk(c);
                setOpen(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setInk(c);
                  setOpen(false);
                }
              }}
            >
              <path d={PETAL} fill={c.hex} />
              <path d={PETAL} fill="url(#ks-paper-grain)" className="ks-petal-grain" />
              <path d="M0 -20 C-2 -36, -1 -50, 0 -60" className="ks-petal-vein" />
              <path d={PETAL} className="ks-petal-edge" />
            </g>
          ))}
          <g
            className="ks-petal-core"
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label={`Ink colour: ${ink.name}. ${open ? 'Close' : 'Open'} colours`}
            onClick={() => setOpen(o => !o)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(o => !o);
              }
            }}
          >
            <circle r="21" fill="#f3e6c8" />
            <circle r="21" fill="url(#ks-paper-grain)" className="ks-petal-grain" />
            <circle r="13" fill={shown.hex} />
            <circle r="21" className="ks-petal-edge" />
          </g>
        </g>
      </svg>
      <p className="ks-petals-name" aria-live="polite">
        {shown.name}
      </p>
    </div>
  );
}

function Preview() {
  return (
    <main className="ks-pc">
      <PaperFilters />
      <header>
        <p>KEEPSAKE / CONTROL STUDY</p>
        <h1>Paper you can pick from.</h1>
        <p>
          Two small experiments: a menu that spills out like paper slips, and an ink picker that opens like a
          pressed flower.
        </p>
      </header>
      <section className="ks-pc-board">
        <figure>
          <PaperSpillDropdown />
          <figcaption>Paper slip menu · click the tag</figcaption>
        </figure>
        <figure>
          <PetalInkPicker />
          <figcaption>Pressed-flower ink picker · click the centre</figcaption>
        </figure>
      </section>
      <section className="ks-pc-today" aria-label="Current controls for comparison">
        <h2>Today in the editor</h2>
        <div>
          <select defaultValue="cream" aria-label="Current paper menu">
            {PAPERS.slice(0, 3).map(p => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="ks-pc-dots">
            {SHARPIE_COLORS.map(c => (
              <i key={c} style={{background: c}} />
            ))}
          </span>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
