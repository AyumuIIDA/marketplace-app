"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { categoryLabel } from "../category-labels";

type CategoryFilterProps = {
  value: string;
  options: string[];
};

// カテゴリ絞り込みセレクト。?category= を更新し、keyword/sort 等の既存クエリは維持する。
// 空選択でフィルタ解除。option の value はスラッグ、表示は対訳ラベル。
export function CategoryFilter({ options, value }: CategoryFilterProps) {
  const t = useTranslations("catalog.category");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(next: string) {
    const search = new URLSearchParams(params.toString());

    if (next === "") {
      search.delete("category");
    } else {
      search.set("category", next);
    }

    router.push(search.size > 0 ? `${pathname}?${search.toString()}` : pathname);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-ink-soft">{t("label")}</span>
      <select
        className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{t("all")}</option>
        {options.map((category) => (
          <option key={category} value={category}>
            {categoryLabel(category, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
