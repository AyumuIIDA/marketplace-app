import type { ReactNode } from "react";

import { ActionButton } from "./action-button";
import { GlassPanel } from "./glass-panel";

type StatePanelProps = {
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  title: string;
};

export function StatePanel({ actionHref, actionLabel, children, title }: StatePanelProps) {
  return (
    <GlassPanel className="p-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children !== undefined && <div className="mt-2 text-sm leading-6 text-ink-soft">{children}</div>}
      {actionHref !== undefined && actionLabel !== undefined && (
        <div className="mt-5">
          <ActionButton href={actionHref} variant="primary">
            {actionLabel}
          </ActionButton>
        </div>
      )}
    </GlassPanel>
  );
}
