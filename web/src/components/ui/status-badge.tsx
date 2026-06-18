import { combineClassNames } from "./class-name";

type StatusBadgeProps = {
  children: string;
  tone?: "neutral" | "good" | "warn" | "seal";
};

const TONE = {
  good: "bg-ok-tint text-ok",
  warn: "bg-warn-tint text-warn",
  neutral: "bg-paper text-ink-soft ring-1 ring-line",
  seal: "bg-seal-tint text-seal-strong",
} as const;

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={combineClassNames(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
