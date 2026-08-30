import type { ReactNode } from "react";
import { DoorOpen } from "lucide-react";
import { RoomFrame } from "../RoomFrame";
import { useNav } from "../../store/nav";

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
  const { back } = useNav();
  return (
    <RoomFrame
      header={
        <>
          <div className="flex items-center gap-3">
            <button className="ks-chip" aria-label="Back to the room" title="Back to the room" onClick={back}>
              <DoorOpen size={16} />
            </button>
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
