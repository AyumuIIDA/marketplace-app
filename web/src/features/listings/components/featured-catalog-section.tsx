import { getTranslations } from "next-intl/server";

import { StatePanel } from "../../../components/ui/state-panel";
import { groupByCategory, type ListingSort } from "../listing-sort";
import type { ListingViewModel } from "../listing-view-model";
import { ListingGrid } from "./listing-grid";

type CatalogSectionProps = {
  listings: ListingViewModel[];
  searchQuery?: string;
  sort: ListingSort;
  previewPerCategory: number;
};

// 各カテゴリは先頭 previewPerCategory 件のみ表示し、「もっと見る」で ?category=X の全件ブラウズへ。
function categoryHref(category: string, searchQuery: string | undefined, sort: ListingSort): string {
  const params = new URLSearchParams();
  params.set("category", category);

  if (searchQuery !== undefined) {
    params.set("keyword", searchQuery);
  }

  if (sort !== "newest") {
    params.set("sort", sort);
  }

  return `/?${params.toString()}`;
}

export async function FeaturedCatalogSection({
  listings,
  previewPerCategory,
  searchQuery,
  sort,
}: CatalogSectionProps) {
  const t = await getTranslations("catalog");

  if (listings.length === 0) {
    return searchQuery === undefined ? (
      <StatePanel actionHref="/listings/new" actionLabel={t("emptyAction")} title={t("emptyTitle")}>
        {t("emptyBody")}
      </StatePanel>
    ) : (
      <StatePanel actionHref="/discover" actionLabel={t("noResultsAction")} title={t("noResultsTitle")}>
        {t("noResultsBody", { query: searchQuery })}
      </StatePanel>
    );
  }

  const groups = groupByCategory(listings, sort);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.category}>
          <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 className="text-base font-semibold text-ink">{group.category}</h2>
            <a
              className="shrink-0 text-sm font-semibold text-seal-strong underline-offset-2 hover:underline"
              href={categoryHref(group.category, searchQuery, sort)}
            >
              {t("showMore")}
            </a>
          </div>
          <ListingGrid listings={group.items.slice(0, previewPerCategory)} />
        </section>
      ))}
    </div>
  );
}
