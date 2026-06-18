"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { LISTING_SORTS, type ListingSort } from "../listing-sort";

type SortControlProps = {
  value: ListingSort;
};

// 並び替えセレクト。?sort= を更新し、keyword 等の既存クエリは維持する。
export function SortControl({ value }: SortControlProps) {
  const t = useTranslations("catalog.sort");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(next: string) {
    const search = new URLSearchParams(params.toString());
    search.set("sort", next);
    router.push(`${pathname}?${search.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-ink-soft">{t("label")}</span>
      <select
        className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {LISTING_SORTS.map((option) => (
          <option key={option} value={option}>
            {t(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
