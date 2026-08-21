import type { ReactNode } from "react";

interface Props {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** The warm room shell that wraps every screen. */
export function RoomFrame({ header, footer, children }: Props) {
  return (
    <div className="ks-room flex h-dvh flex-col overflow-hidden">
      {header && (
        <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
          {header}
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
