import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../components/layout/marketplace-shell";
import { CategoryBrowser } from "../../listings/components/category-browser";
import { CategoryFilter } from "../../listings/components/category-filter";
import { FeaturedCatalogSection } from "../../listings/components/featured-catalog-section";
import { SortControl } from "../../listings/components/sort-control";
import { distinctCategories, type ListingSort } from "../../listings/listing-sort";
import type { ListingViewModel } from "../../listings/listing-view-model";

// ホームの各カテゴリで先頭に出すプレビュー件数。
const PREVIEW_PER_CATEGORY = 6;

type MarketplaceHomeViewProps = {
  authenticated: boolean;
  category?: string;
  categoryItems: ListingViewModel[];
  humanLabel: string;
  listings: ListingViewModel[];
  pageSize: number;
  searchQuery?: string;
  sort: ListingSort;
  userLabel: string;
};

export async function MarketplaceHomeView({
  authenticated,
  category,
  categoryItems,
  humanLabel,
  listings,
  pageSize,
  searchQuery,
  sort,
  userLabel,
}: MarketplaceHomeViewProps) {
  const t = await getTranslations("catalog");

  // カテゴリ候補は取得集合から抽出。選択中カテゴリが含まれなければ補う。
  const categories = distinctCategories(listings);
  const options =
    category !== undefined && !categories.includes(category)
      ? [...categories, category].sort((a, b) => a.localeCompare(b))
      : categories;

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={authenticated}
      humanLabel={humanLabel}
      searchQuery={searchQuery}
      userLabel={userLabel}
    >
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {searchQuery === undefined ? t("title") : t("searchResults", { query: searchQuery })}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CategoryFilter options={options} value={category ?? ""} />
          <SortControl value={sort} />
        </div>
      </div>

      {category === undefined ? (
        <FeaturedCatalogSection
          listings={listings}
          previewPerCategory={PREVIEW_PER_CATEGORY}
          searchQuery={searchQuery}
          sort={sort}
        />
      ) : (
        <CategoryBrowser
          category={category}
          initialItems={categoryItems}
          keyword={searchQuery}
          pageSize={pageSize}
          sort={sort}
        />
      )}
    </MarketplaceShell>
  );
}
