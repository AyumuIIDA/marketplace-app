import type { ReactNode } from "react";

type FormFieldProps = {
  children: ReactNode;
  label: string;
};

export function FormField({ children, label }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-[18px] border border-neutral-200 bg-white/86 px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

export const textareaClassName =
  "min-h-36 w-full resize-y rounded-[18px] border border-neutral-200 bg-white/86 px-4 py-3 text-sm leading-6 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";
