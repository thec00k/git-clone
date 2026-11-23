// A dropdown whose options spring out of a paper tag as cut-paper slips.
// Meant for occasional choices (page paper), not frequently used tools.
import {useEffect, useId, useRef, useState} from 'react';
import {PaperFilters} from './PaperFilters';
import '../paperControls.css';

export interface PaperSlipOption {
  value: string;
  label: string;
  swatch?: string;
}

export function PaperSlipSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly PaperSlipOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const fid = useId().replace(/:/g, '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) ?? options[0];
  const isOpen = open && !disabled;
  useEffect(() => {
    if (!isOpen) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [isOpen]);
  const toggle = () => {
    setActive(Math.max(0, options.indexOf(current)));
    setOpen(o => !o);
  };
  const choose = (v: string) => {
    setOpen(false);
    if (v !== value) onChange(v);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) toggle();
      else setActive(a => (a + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
    } else if ((e.key === 'Enter' || e.key === ' ') && isOpen) {
      e.preventDefault();
      choose(options[active].value);
    }
  };
  const n = {'--n': options.length} as React.CSSProperties;
  return (
    <div
      ref={root}
      className={`ks-spill ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
      style={n}
      onKeyDown={onKey}
    >
      <PaperFilters id={fid} />
      <div className="ks-spill-paper" aria-hidden="true" style={{filter: `url(#${fid}-goo)`}}>
        <span className="ks-spill-blob ks-spill-tag" />
        {options.map((o, i) => (
          <span
            key={o.value}
            className="ks-spill-blob ks-spill-slip"
            style={{'--i': i} as React.CSSProperties}
          />
        ))}
      </div>
      <button
        type="button"
        className="ks-spill-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}: ${current.label}`}
        disabled={disabled}
        onClick={toggle}
      >
        <small>{label}</small>
        <span>
          {current.swatch && <i style={{background: current.swatch}} />}
          {current.label}
        </span>
        <svg className="ks-spill-caret" viewBox="0 0 16 10" aria-hidden="true">
          <path d="M2 2.5 C5 5, 6.5 7, 8 8 C10 6, 12 4, 14 2" />
        </svg>
      </button>
      <ul role="listbox" aria-label={label} className="ks-spill-options">
        {options.map((o, i) => (
          <li
            key={o.value}
            role="option"
            aria-selected={o.value === value}
            className={i === active ? 'is-active' : ''}
            style={{'--i': i} as React.CSSProperties}
            onPointerEnter={() => setActive(i)}
            onClick={() => choose(o.value)}
          >
            {o.swatch && <i style={{background: o.swatch}} />}
            {o.label}
            {o.value === value && (
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
