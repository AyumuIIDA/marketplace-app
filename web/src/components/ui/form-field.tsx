import type { ReactNode } from "react";

type FormFieldProps = {
  children: ReactNode;
  label: string;
};

export function FormField({ children, label }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-md border border-line-strong bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink focus-visible:ring-2 focus-visible:ring-ink/15";

export const textareaClassName =
  "min-h-36 w-full resize-y rounded-md border border-line-strong bg-surface px-4 py-3 text-sm leading-6 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink focus-visible:ring-2 focus-visible:ring-ink/15";
