export function VolumeSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-3 block text-sm text-paper/60" htmlFor={id}>
      {label}
      <input
        id={id}
        name={id}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}
