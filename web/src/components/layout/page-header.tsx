import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow !== undefined && (
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">{eyebrow}</p>
        )}
        <h1 className={`${eyebrow === undefined ? "" : "mt-2"} text-2xl font-bold tracking-tight text-ink md:text-3xl`}>
          {title}
        </h1>
        {description !== undefined && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-soft">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
