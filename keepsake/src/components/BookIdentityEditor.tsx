import { COVER_STYLES } from "../types/scrapbook";
import type { CoverStyle } from "../types/scrapbook";

/** Title, subtitle, and leather colour — used on the shelf and the open book. */
export function BookIdentityEditor({
  title,
  subtitle,
  coverStyle,
  onTitle,
  onSubtitle,
  onCover,
}: {
  title: string;
  subtitle: string;
  coverStyle: CoverStyle;
  onTitle: (value: string) => void;
  onSubtitle: (value: string) => void;
  onCover: (cover: CoverStyle) => void;
}) {
  const cover = COVER_STYLES[coverStyle];
  return (
    <div className="space-y-2">
      <label className="block text-sm text-paper/60">
        Title
        <input
          name="bookTitle"
          aria-label="Book title"
          className="mt-1 w-full rounded bg-black/25 px-2 py-1.5 text-sm text-paper outline-none"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </label>
      <label className="block text-sm text-paper/60">
        Title-page line
        <input
          name="bookSubtitle"
          aria-label="Book subtitle"
          className="mt-1 w-full rounded bg-black/25 px-2 py-1.5 text-sm text-paper outline-none"
          value={subtitle}
          onChange={(e) => onSubtitle(e.target.value)}
        />
      </label>
      <div>
        <p className="mb-1.5 text-sm text-paper/60">Cover leather</p>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex h-14 w-10 items-center justify-center rounded-sm text-center text-[0.55rem] leading-tight"
            style={{
              background: `linear-gradient(90deg, rgb(0 0 0 /.35), transparent 14%), url('/textures/leather.jpg') center/cover`,
              backgroundColor: cover.leather,
              color: cover.ink,
            }}
            aria-hidden="true"
          >
            {title.slice(0, 8) || "book"}
          </div>
          {(Object.keys(COVER_STYLES) as CoverStyle[]).map((c) => (
            <button
              key={c}
              type="button"
              title={COVER_STYLES[c].label}
              aria-label={`Cover colour ${COVER_STYLES[c].label}`}
              aria-pressed={coverStyle === c}
              onClick={() => onCover(c)}
              className={`h-6 w-6 rounded-full border ${coverStyle === c ? "border-accent" : "border-white/20"}`}
              style={{ background: COVER_STYLES[c].leather }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
