import { combineClassNames } from "./class-name";

type StatusBadgeProps = {
  children: string;
  tone?: "neutral" | "good" | "warn";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={combineClassNames(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "good" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
        tone === "warn" && "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
        tone === "neutral" && "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200",
      )}
    >
      {children}
    </span>
  );
}
