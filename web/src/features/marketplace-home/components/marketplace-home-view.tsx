import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../components/layout/marketplace-shell";
import { ActionButton } from "../../../components/ui/action-button";
import { Seal } from "../../../components/ui/seal";
import { CategoryBrowser } from "../../listings/components/category-browser";
import { CategoryFilter } from "../../listings/components/category-filter";
import { FeaturedCatalogSection } from "../../listings/components/featured-catalog-section";
import { SortControl } from "../../listings/components/sort-control";
import { VerifiedFilter } from "../../listings/components/verified-filter";
import type { ListingCategory } from "../../../lib/api/listings.api";
import type { ListingSort } from "../../listings/listing-sort";
import type { ListingViewModel } from "../../listings/listing-view-model";

// ホームの各カテゴリで先頭に出すプレビュー件数。
const PREVIEW_PER_CATEGORY = 6;

type MarketplaceHomeViewProps = {
  authenticated: boolean;
  category?: string;
  categories: ListingCategory[];
  categoryItems: ListingViewModel[];
  categoryTotal: number;
  humanLabel: string;
  likedIds: Set<string>;
  pageSize: number;
  searchQuery?: string;
  seed?: string;
  signed?: boolean;
  sort: ListingSort;
  userLabel: string;
  verifiedOnly: boolean;
};

export async function MarketplaceHomeView({
  authenticated,
  category,
  categories,
  categoryItems,
  categoryTotal,
  humanLabel,
  likedIds,
  pageSize,
  searchQuery,
  seed,
  signed,
  sort,
  userLabel,
  verifiedOnly,
}: MarketplaceHomeViewProps) {
  const [t, home] = await Promise.all([getTranslations("catalog"), getTranslations("home")]);

  // カテゴリ候補はサーバ（公開中の全出品）から取得した正本。選択中カテゴリが含まれなければ補う。
  const categoryNames = categories.map((item) => item.category);
  const options =
    category !== undefined && !categoryNames.includes(category)
      ? [...categoryNames, category].sort((a, b) => a.localeCompare(b))
      : categoryNames;
  // 検索もカテゴリ選択もしていない初期着地時にだけヒーロー（主張）を出す。
  const isLanding = searchQuery === undefined && category === undefined;

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={authenticated}
      humanLabel={humanLabel}
      searchQuery={searchQuery}
      userLabel={userLabel}
    >
      {isLanding && (
        <section className="mb-8 overflow-hidden rounded-lg border border-line bg-surface">
          <div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-seal">{home("heroEyebrow")}</p>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
                {home("heroTitle")}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">{home("heroBody")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton href="/discover" variant="accent">
                  {home("heroDiscover")}
                </ActionButton>
                <ActionButton href="/listings/new" variant="secondary">
                  {home("heroSell")}
                </ActionButton>
              </div>
            </div>
            <Seal animate className="hidden md:block" size="xl" />
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {isLanding ? (
            <h2 className="text-xl font-bold tracking-tight text-ink">{t("title")}</h2>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              {searchQuery === undefined ? t("title") : t("searchResults", { query: searchQuery })}
            </h1>
          )}
          <p className="mt-1.5 text-sm text-ink-soft">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <VerifiedFilter active={verifiedOnly} />
          <CategoryFilter options={options} value={category ?? ""} />
          <SortControl value={sort} />
        </div>
      </div>

      {category === undefined ? (
        <FeaturedCatalogSection
          categories={categories}
          likedIds={likedIds}
          previewPerCategory={PREVIEW_PER_CATEGORY}
          searchQuery={searchQuery}
          seed={seed}
          signed={signed}
          sort={sort}
        />
      ) : (
        <CategoryBrowser
          // initialItems を変える入力（カテゴリ/検索語/並び順/認証）が変わったら再マウントして state を作り直す。
          // これが無いと「カテゴリ→別カテゴリ」のクライアント遷移で useState(initialItems) が前の値のまま固定される。
          key={`${category}:${searchQuery ?? ""}:${sort}:${verifiedOnly}`}
          category={category}
          initialItems={categoryItems}
          keyword={searchQuery}
          pageSize={pageSize}
          seed={seed}
          sort={sort}
          totalCount={categoryTotal}
          verifiedOnly={verifiedOnly}
        />
      )}
    </MarketplaceShell>
  );
}
