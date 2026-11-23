// An ink colour picker whose paper petals open like a pressed flower.
// `compact` shows a small button and blooms the flower above it (toolbars).
import {useEffect, useId, useRef, useState} from 'react';
import {PaperFilters} from './PaperFilters';
import '../paperControls.css';

export interface Ink {
  color: string;
  name: string;
}
const PETAL = 'M0 -14 C-17 -26, -19 -54, 0 -70 C19 -54, 17 -26, 0 -14 Z';

export function PetalInkPicker({
  inks,
  value,
  compact,
  onChange,
}: {
  inks: readonly Ink[];
  value?: string;
  compact?: boolean;
  onChange: (color: string) => void;
}) {
  const fid = useId().replace(/:/g, '');
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const ink = inks.find(i => i.color === value) ?? inks[0];
  const shown = inks.find(i => i.color === hover) ?? ink;
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [open]);
  const pick = (c: string) => {
    setOpen(false);
    setHover(null);
    onChange(c);
  };
  return (
    <div
      ref={root}
      className={`ks-petals ${open ? 'is-open' : ''} ${compact ? 'is-compact' : ''}`}
      onKeyDown={e => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <PaperFilters id={fid} />
      <svg className="ks-petals-bloom" viewBox="-100 -100 200 200" role="group" aria-label="Ink colours">
        <g filter={`url(#${fid}-cut)`}>
          {inks.map((c, i) => (
            <g
              key={c.color}
              className="ks-petal"
              style={{'--a': `${(360 / inks.length) * i}deg`, '--i': i} as React.CSSProperties}
              role="button"
              tabIndex={open ? 0 : -1}
              aria-label={`${c.name} ink`}
              aria-pressed={c.color === ink.color}
              onPointerEnter={() => setHover(c.color)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(c.color)}
              onBlur={() => setHover(null)}
              onClick={() => pick(c.color)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(c.color);
                }
              }}
            >
              <path d={PETAL} fill={c.color} />
              <path d={PETAL} fill={`url(#${fid}-grain)`} className="ks-petal-grain" />
              <path d="M0 -20 C-2 -36, -1 -50, 0 -60" className="ks-petal-vein" />
              <path d={PETAL} className="ks-petal-edge" />
            </g>
          ))}
          {compact && (
            <g className="ks-petal-heart" aria-hidden="true">
              <circle r="18" fill="#f3e6c8" />
              <circle r="11" fill={shown.color} />
              <circle r="18" className="ks-petal-edge" />
            </g>
          )}
        </g>
      </svg>
      <button
        type="button"
        className="ks-petals-core"
        aria-expanded={open}
        aria-label={`Ink colour: ${ink.name}`}
        title="Ink colour"
        style={
          {
            '--ink': compact ? (value ?? ink.color) : shown.color,
            filter: `url(#${fid}-cut)`,
          } as React.CSSProperties
        }
        onClick={() => setOpen(o => !o)}
      />
      <p className="ks-petals-name" aria-live="polite">
        {shown.name}
      </p>
    </div>
  );
}
