import type { ReactNode } from "react";

import { combineClassNames } from "./class-name";

type ActionButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
};

export function ActionButton({
  children,
  className,
  disabled = false,
  href,
  onClick,
  type = "button",
  variant = "secondary",
}: ActionButtonProps) {
  const buttonClassName = combineClassNames(
    "inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition",
    variant === "primary"
      ? "bg-neutral-950 text-white shadow-sm hover:bg-neutral-800"
      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
    disabled && "cursor-not-allowed opacity-55",
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
    <button className={buttonClassName} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}
