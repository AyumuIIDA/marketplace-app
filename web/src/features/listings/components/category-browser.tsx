"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { loadMoreListingsAction } from "../actions/catalog.actions";
import { sortListings, type ListingSort } from "../listing-sort";
import type { ListingViewModel } from "../listing-view-model";
import { ListingCard } from "./listing-card";

type CategoryBrowserProps = {
  category: string;
  initialItems: ListingViewModel[];
  keyword?: string;
  pageSize: number;
  sort: ListingSort;
};

// 単一カテゴリの全件ブラウズ。Load more で offset ページを追記し、尽きるまで辿れる。
export function CategoryBrowser({ category, initialItems, keyword, pageSize, sort }: CategoryBrowserProps) {
  const t = useTranslations("catalog");
  const seal = useTranslations("seal");
  const social = useTranslations("social");
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length === pageSize);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const next = await loadMoreListingsAction({
        keyword,
        category,
        offset: items.length,
        limit: pageSize,
      });
      setItems((current) => [...current, ...next]);
      setHasMore(next.length === pageSize);
    });
  }

  const sorted = sortListings(items, sort);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="text-base font-semibold text-ink">{category}</h2>
        <span className="font-mono text-xs text-ink-faint">{t("count", { count: items.length })}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((item) => (
          <ListingCard
            draftLabel={t("draft")}
            item={item}
            key={item.id}
            likeLabel={social("likeItem")}
            signedLabel={seal("humanSigned")}
            soldLabel={t("sold")}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        {hasMore ? (
          <button
            className="rounded-md border border-line-strong bg-surface px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
            disabled={isPending}
            onClick={loadMore}
            type="button"
          >
            {isPending ? t("loading") : t("loadMore")}
          </button>
        ) : (
          <p className="text-sm text-ink-faint">{t("noMore")}</p>
        )}
      </div>
    </section>
  );
}
