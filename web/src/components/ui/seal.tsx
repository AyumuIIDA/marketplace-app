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
  sm: "size-7 border-[1.5px]",
  md: "size-10 border-2",
  lg: "size-16 border-[3px]",
  xl: "size-40 border-4",
} as const;

export function Seal({ animate = false, className, label, size = "md", tone = "light" }: SealProps) {
  return (
    <span
      aria-hidden={label === undefined}
      aria-label={label}
      role={label === undefined ? undefined : "img"}
      className={combineClassNames(
        "inline-grid shrink-0 place-items-center rounded-full leading-none select-none",
        SIZE[size],
        tone === "dark"
          ? "border-seal/90 text-seal shadow-[0_0_28px_rgba(216,64,47,0.55)]"
          : "border-seal text-seal",
        animate && "animate-seal-breathe",
        className,
      )}
    >
      {/* 漢字「人」を上下反転させた脚＝胴体＋頭の円で人型を構成。currentColor で朱色を継承。 */}
      <svg className="size-[72%]" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="4.6" r="3.7" />
        <g transform="translate(0 24) scale(1 -1)">
          <text
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="18"
            fontWeight="700"
            textAnchor="middle"
            x="12"
            y="14"
          >
            人
          </text>
        </g>
      </svg>
    </span>
  );
}
