import type { ReactNode } from "react";

import { combineClassNames } from "./class-name";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
};

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={combineClassNames(
        "rounded-[30px] bg-white/72 shadow-[0_24px_80px_rgba(42,51,76,0.12)] ring-1 ring-white/80 backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
