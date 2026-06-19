import { combineClassNames } from "./class-name";

/*
  署名要素。検証済みの人間が押した「朱の印」。Human-backed の核を体現し、
  EC面では静かなスタンプ、/discover では発光する主役として同一の印を再利用する。

  variant:
   - "outline"（既定）: 朱の輪郭線＋朱の人型。面に静かに置く印。
   - "badge": 朱ベタ＋紙色の人型＋紙色リング。アバター隅に重ねる検証バッジ用。
     小サイズでは輪郭線が潰れるため、塗り＋リングで視認性を確保する（検証バッジの定石）。
*/
type SealProps = {
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  tone?: "light" | "dark";
  variant?: "outline" | "badge";
  animate?: boolean;
  className?: string;
  label?: string;
};

// 寸法（直径）。border 幅は outline 時のみ別途付与する。
const DIM = {
  "2xs": "size-4",
  xs: "size-5",
  sm: "size-7",
  md: "size-10",
  lg: "size-16",
  xl: "size-40",
} as const;

// outline 用の枠線幅（寸法に比例）。
const OUTLINE_BORDER = {
  "2xs": "border",
  xs: "border",
  sm: "border-[1.5px]",
  md: "border-2",
  lg: "border-[3px]",
  xl: "border-4",
} as const;

export function Seal({
  animate = false,
  className,
  label,
  size = "md",
  tone = "light",
  variant = "outline",
}: SealProps) {
  return (
    <span
      aria-hidden={label === undefined}
      aria-label={label}
      role={label === undefined ? undefined : "img"}
      className={combineClassNames(
        "inline-grid shrink-0 place-items-center rounded-full leading-none select-none",
        DIM[size],
        variant === "badge"
          ? // 塗り版: 朱ベタに紙色の人型をヌキ、紙色リングで下地（アバター等）から分離する。
            "bg-seal text-paper ring-2 ring-paper"
          : combineClassNames(
              OUTLINE_BORDER[size],
              tone === "dark"
                ? "border-seal/90 text-seal shadow-[0_0_28px_rgba(216,64,47,0.55)]"
                : "border-seal text-seal",
            ),
        animate && "animate-seal-breathe",
        className,
      )}
    >
      {/* 漢字「人」を上下反転させた脚＝胴体＋頭の円で人型を構成。currentColor で色を継承。 */}
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
