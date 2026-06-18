import type { ReactNode } from "react";

import { combineClassNames } from "./class-name";

type ActionButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  name?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  value?: string;
  variant?: "primary" | "secondary" | "accent";
};

const VARIANT = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-paper",
  accent: "bg-seal text-white hover:bg-seal-strong",
} as const;

export function ActionButton({
  children,
  className,
  disabled = false,
  href,
  name,
  onClick,
  type = "button",
  value,
  variant = "secondary",
}: ActionButtonProps) {
  const buttonClassName = combineClassNames(
    "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    VARIANT[variant],
    disabled && "pointer-events-none opacity-50",
    className,
  );

  if (href !== undefined) {
    return (
      <a className={buttonClassName} href={href}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={buttonClassName}
      disabled={disabled}
      name={name}
      onClick={onClick}
      type={type}
      value={value}
    >
      {children}
    </button>
  );
}
