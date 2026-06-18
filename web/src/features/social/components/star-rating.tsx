import { combineClassNames } from "../../../components/ui/class-name";

type StarRatingProps = {
  value: number;
  className?: string;
};

// 読み取り専用の星評価表示。filled = 四捨五入した評価値。
export function StarRating({ className, value }: StarRatingProps) {
  const filled = Math.round(value);

  return (
    <span aria-label={`${value.toFixed(1)} / 5`} className={combineClassNames("inline-flex items-center gap-0.5", className)} role="img">
      {[1, 2, 3, 4, 5].map((position) => (
        <Star className="size-4" filled={position <= filled} key={position} />
      ))}
    </span>
  );
}

function Star({ className, filled }: { className?: string; filled: boolean }) {
  return (
    <svg
      aria-hidden
      className={combineClassNames(className, filled ? "text-seal" : "text-line-strong")}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M10 1.5l2.6 5.3 5.9.86-4.25 4.14 1 5.86L10 15.9l-5.25 2.76 1-5.86L1.5 7.66l5.9-.86L10 1.5Z" />
    </svg>
  );
}
