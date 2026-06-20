import { getTranslations } from "next-intl/server";

import { StatePanel } from "../../../components/ui/state-panel";
import { searchListings, type ListingCategory } from "../../../lib/api/listings.api";
import { groupByCategory, type ListingSort } from "../listing-sort";
import type { ListingViewModel } from "../listing-view-model";
import { mapListingsToViewModels } from "../listing.mapper";
import { CategoryLabel } from "./category-label";
import { ListingGrid } from "./listing-grid";

type CatalogSectionProps = {
  categories: ListingCategory[];
  likedIds: Set<string>;
  searchQuery?: string;
  sort: ListingSort;
  seed?: string;
  signed?: boolean;
  previewPerCategory: number;
};

// 各カテゴリは先頭 previewPerCategory 件のみ表示し、「もっと見る」で ?category=X の全件ブラウズへ。
function categoryHref(category: string, searchQuery: string | undefined, sort: ListingSort): string {
  const params = new URLSearchParams();
  params.set("category", category);

  if (searchQuery !== undefined) {
    params.set("keyword", searchQuery);
  }

  if (sort !== "shuffle") {
    params.set("sort", sort);
  }

  return `/?${params.toString()}`;
}

// ホームの注目カタログ。純粋なランディングでは「カテゴリごとに上位 previewPerCategory 件」をサーバから
// 並列取得し、公開中の全カテゴリを網羅する（フラットなサンプルを分割していた頃の「薄い/カテゴリ欠落」を解消）。
// keyword 検索時はカテゴリ横断で一致を集めてからグループ化する（検索結果のカテゴリ別表示）。
export async function FeaturedCatalogSection({
  categories,
  likedIds,
  previewPerCategory,
  searchQuery,
  seed,
  signed,
  sort,
}: CatalogSectionProps) {
  const t = await getTranslations("catalog");

  let groups: { category: string; items: ListingViewModel[] }[];
  if (searchQuery !== undefined) {
    const flat = mapListingsToViewModels(
      await searchListings({ keyword: searchQuery, limit: 60, sort, seed, signed }),
      likedIds,
    );
    groups = groupByCategory(flat).map((group) => ({
      category: group.category,
      items: group.items.slice(0, previewPerCategory),
    }));
  } else {
    groups = (
      await Promise.all(
        categories.map(async (category) => ({
          category: category.category,
          items: mapListingsToViewModels(
            await searchListings({ category: category.category, limit: previewPerCategory, sort, seed, signed }),
            likedIds,
          ),
        })),
      )
    ).filter((group) => group.items.length > 0);
  }

  if (groups.length === 0) {
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

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.category}>
          <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 className="text-base font-semibold text-ink"><CategoryLabel slug={group.category} /></h2>
            <a
              className="shrink-0 text-sm font-semibold text-seal-strong underline-offset-2 hover:underline"
              href={categoryHref(group.category, searchQuery, sort)}
            >
              {t("showMore")}
            </a>
          </div>
          <ListingGrid listings={group.items} />
        </section>
      ))}
    </div>
  );
}
