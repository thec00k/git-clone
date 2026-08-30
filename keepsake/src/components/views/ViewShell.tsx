import type { ReactNode } from "react";
import { DoorOpen } from "lucide-react";
import { RoomFrame } from "../RoomFrame";
import { useNav } from "../../store/nav";

export function BackChip({ onClick }: { onClick?: () => void } = {}) {
  const { back, backAria, backLabel } = useNav();
  return (
    <button className="ks-chip" aria-label={backAria} title={backAria} onClick={onClick ?? back}>
      <DoorOpen size={16} />
      <span className="hidden sm:inline">{backLabel}</span>
    </button>
  );
}

export function ViewShell({
  title,
  subtitle,
  actions,
  scroll = true,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <RoomFrame
      header={
        <>
          <div className="flex items-center gap-3">
            <BackChip />
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
      <div className={`mx-auto w-full max-w-4xl px-4 pb-8 ${scroll ? "overflow-y-auto" : ""}`}>
        {children}
      </div>
    </RoomFrame>
  );
}
