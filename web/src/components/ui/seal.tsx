import { combineClassNames } from "./class-name";

/*
  署名要素。検証済みの人間が押した「朱の印」。Human-backed の核を体現し、
  EC面では静かなスタンプ、/discover では発光する主役として同一の印を再利用する。
*/
type SealProps = {
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "light" | "dark";
  animate?: boolean;
  className?: string;
  label?: string;
};

const SIZE = {
  sm: "size-7 text-[13px] border-[1.5px]",
  md: "size-10 text-lg border-2",
  lg: "size-16 text-3xl border-[3px]",
  xl: "size-40 text-8xl border-4",
} as const;

export function Seal({ animate = false, className, label, size = "md", tone = "light" }: SealProps) {
  return (
    <span
      aria-hidden={label === undefined}
      aria-label={label}
      role={label === undefined ? undefined : "img"}
      className={combineClassNames(
        "inline-grid shrink-0 -rotate-6 place-items-center rounded-full font-bold leading-none select-none",
        SIZE[size],
        tone === "dark"
          ? "border-seal/90 text-seal shadow-[0_0_28px_rgba(216,64,47,0.55)]"
          : "border-seal text-seal",
        animate && "animate-seal-breathe",
        className,
      )}
    >
      人
    </span>
  );
}
