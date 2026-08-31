import type { ReactNode } from "react";
import { DoorOpen } from "lucide-react";
import { RoomFrame } from "../RoomFrame";
import { useNav } from "../../store/nav";

/** Home control — always returns to the desk, in the original top-left spot. */
export function HomeChip({ onClick }: { onClick?: () => void } = {}) {
  const { goDesk, backAria, backLabel } = useNav();
  return (
    <button
      className="ks-chip ks-chip--home"
      aria-label={backAria}
      title={backAria}
      onClick={onClick ?? goDesk}
    >
      <DoorOpen size={16} />
      <span className="hidden sm:inline">{backLabel}</span>
    </button>
  );
}

/** @deprecated Use HomeChip — the header always goes home to the desk. */
export const BackChip = HomeChip;

/** Lower side rails to turn to the map or the bookshelf. */
export function RoomNavRails() {
  const { goWall } = useNav();
  return (
    <nav className="ks-returns" aria-label="Turn the room">
      <button
        type="button"
        className="ks-return ks-return--left ks-return--map"
        aria-label="View the corkboard map"
        onClick={() => goWall("left")}
      >
        <span className="ks-return-label">Corkboard map</span>
      </button>
      <button
        type="button"
        className="ks-return ks-return--right ks-return--shelf"
        aria-label="View the bookshelf"
        onClick={() => goWall("right")}
      >
        <span className="ks-return-label">Bookshelf</span>
      </button>
    </nav>
  );
}

export function ViewShell({
  title,
  subtitle,
  actions,
  scroll = true,
  fill = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  scroll?: boolean;
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <RoomFrame
      header={
        <>
          <div className="flex items-center gap-3">
            <HomeChip />
            <div className="leading-tight">
              <p className="font-display font-semibold text-paper">{title}</p>
              {subtitle && (
                <p className="ks-caption text-paper/70" style={{ fontSize: "1.05rem" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </>
      }
    >
      <RoomNavRails />
      <div
        className={
          fill
            ? "flex min-h-0 flex-1 flex-col"
            : `mx-auto w-full max-w-4xl px-4 pb-8 ${scroll ? "overflow-y-auto" : ""}`
        }
        style={fill ? undefined : { paddingLeft: "calc(var(--return-w) + 0.75rem)", paddingRight: "calc(var(--return-w) + 0.75rem)" }}
      >
        {children}
      </div>
    </RoomFrame>
  );
}
