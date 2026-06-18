import type { ReactNode } from "react";

import { combineClassNames } from "./class-name";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
};

// フラットEC面の基本サーフェス。白地＋1px境界＋微細エレベーション（旧ガラス効果は廃止）。
export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={combineClassNames(
        "rounded-lg border border-line bg-surface shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
