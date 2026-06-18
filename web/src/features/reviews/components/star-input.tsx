"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// 対話的な星評価入力。選択値は hidden input(name=rating) で送信する。
export function StarInput({ defaultValue = 5, name }: { defaultValue?: number; name: string }) {
  const t = useTranslations("reviewForm");
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState<number | undefined>();
  const shown = hover ?? value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(undefined)}>
      <input name={name} type="hidden" value={value} />
      {[1, 2, 3, 4, 5].map((position) => (
        <button
          aria-label={t("ratingStarLabel", { count: position })}
          aria-pressed={position === value}
          className="rounded p-0.5 text-2xl leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal"
          key={position}
          onClick={() => setValue(position)}
          onMouseEnter={() => setHover(position)}
          type="button"
        >
          <span className={position <= shown ? "text-seal" : "text-line-strong"}>★</span>
        </button>
      ))}
      <span className="ml-2 font-mono text-sm text-ink-soft">{value}/5</span>
    </div>
  );
}
