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
              <p className="font-display font-semibold text-ink">{title}</p>
              {subtitle && (
                <p className="ks-caption text-ink/70" style={{ fontSize: "1.05rem" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </>
      }
    >
      <div
        className={
          fill
            ? "flex min-h-0 flex-1 flex-col"
            : `mx-auto w-full max-w-4xl px-4 pb-8 ${scroll ? "overflow-y-auto" : ""}`
        }
      >
        {children}
      </div>
    </RoomFrame>
  );
}
