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
          <p className="text-sm font-medium text-neutral-500">{eyebrow}</p>
        )}
        <h1 className={`${eyebrow === undefined ? "" : "mt-2"} text-3xl font-semibold tracking-normal text-neutral-950 md:text-5xl`}>
          {title}
        </h1>
        {description !== undefined && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
