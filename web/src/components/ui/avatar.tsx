import { combineClassNames } from "./class-name";

// アカウント画像。avatarUrl があればそれを、無ければ seed から identicon を生成して表示する。
// 同一 seed（表示名）なら常に同じ絵柄。SVGをその場で描画するので外部fetch不要。
type AvatarProps = {
  seed: string;
  src?: string;
  alt?: string;
  className?: string;
};

// FNV-1a。seed文字列を 32bit ハッシュへ。色相とピクセル配置の元にする。
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const GRID = 5;
const COLS = 3; // 左半分（0..2）だけ決めて右へミラー＝左右対称（GitHub風）

export function Avatar({ alt = "", className, seed, src }: AvatarProps) {
  const base = combineClassNames(
    "size-10 shrink-0 overflow-hidden rounded-full bg-paper ring-1 ring-line",
    className,
  );

  if (src !== undefined && src.length > 0) {
    return <img alt={alt} className={combineClassNames(base, "object-cover")} loading="lazy" src={src} />;
  }

  const h = hashSeed(seed.length > 0 ? seed : "anon");
  const hue = h % 360;
  const fg = `hsl(${hue}, 58%, 50%)`;
  const fg2 = `hsl(${(hue + 32) % 360}, 56%, 45%)`;
  const bg = `hsl(${hue}, 30%, 94%)`;

  const cells: { key: string; x: number; y: number; fill: string }[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < COLS; x++) {
      if (((h >> (y * COLS + x)) & 1) === 0) {
        continue;
      }
      const fill = (x + y) % 2 === 0 ? fg : fg2;
      cells.push({ key: `${x}-${y}`, x, y, fill });
      const mirrorX = GRID - 1 - x;
      if (mirrorX !== x) {
        cells.push({ key: `${mirrorX}-${y}`, x: mirrorX, y, fill });
      }
    }
  }

  return (
    <span aria-label={alt.length > 0 ? alt : undefined} className={base} role={alt.length > 0 ? "img" : undefined}>
      <svg className="size-full" preserveAspectRatio="xMidYMid meet" viewBox="-0.6 -0.6 6.2 6.2">
        <rect fill={bg} height={6.2} width={6.2} x={-0.6} y={-0.6} />
        {cells.map((c) => (
          <rect fill={c.fill} height={1} key={c.key} rx={0.18} width={1} x={c.x} y={c.y} />
        ))}
      </svg>
    </span>
  );
}
