import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { MarketplaceHomeView } from "../src/features/marketplace-home/components/marketplace-home-view";
import { toShellUserLabels } from "../src/features/current-user/shell-user";
import { PurchaseToast } from "../src/features/listings/components/purchase-toast";
import { parseListingSort } from "../src/features/listings/listing-sort";
import { mapListingsToViewModels } from "../src/features/listings/listing.mapper";
import { FEED_SEED_COOKIE } from "../src/lib/feed/seed";
import { getCurrentUser } from "../src/lib/api/current-user.api";
import { getCategories, searchListings } from "../src/lib/api/listings.api";
import { getLikedListingIds } from "../src/lib/api/social.api";
import { ensureOnboarded } from "../src/lib/auth/onboarding";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    keyword?: string;
    sort?: string;
    category?: string;
    verified?: string;
    purchased?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await ensureOnboarded("/");
  const { category, keyword, purchased, sort, verified } = await searchParams;
  const trimmedKeyword = keyword?.trim();
  const searchQuery = trimmedKeyword === undefined || trimmedKeyword.length === 0 ? undefined : trimmedKeyword;
  const trimmedCategory = category?.trim();
  const selectedCategory = trimmedCategory === undefined || trimmedCategory.length === 0 ? undefined : trimmedCategory;
  const verifiedOnly = verified === "1";
  const signed = verifiedOnly ? true : undefined;
  const sortValue = parseListingSort(sort);
  // shuffle(おすすめ順)はセッション一貫の seed で決定的に。middleware が発行したクッキーを読む。
  const seed = (await cookies()).get(FEED_SEED_COOKIE)?.value;
  const pageSize = 24;

  // 並び順・認証フィルタ・カテゴリ候補はすべてサーバ側で確定する（取得窓の上で近似しない）。
  // 注目カタログ(カテゴリ別プレビュー)は FeaturedCatalogSection が facet を元に自分で取得する。
  // ここではカテゴリ選択時のみ、そのカテゴリの1ページ目を取る。
  const [currentUser, categories, categoryPage, likedIds] = await Promise.all([
    getCurrentUser(),
    getCategories(),
    selectedCategory === undefined
      ? Promise.resolve([])
      : searchListings({
          keyword: searchQuery,
          category: selectedCategory,
          limit: pageSize,
          sort: sortValue,
          seed,
          signed,
        }),
    getLikedListingIds(),
  ]);
  // カテゴリ見出しの件数は読み込んだページ数ではなく facet の総数を出す（「24件」ではなく実数）。
  const categoryTotal =
    selectedCategory === undefined
      ? 0
      : (categories.find((c) => c.category === selectedCategory)?.count ?? categoryPage.length);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);
  const purchaseT = await getTranslations("purchase");

  return (
    <>
      {purchased === "1" && <PurchaseToast message={purchaseT("completed")} />}
      <MarketplaceHomeView
      authenticated={currentUser !== undefined}
      categories={categories}
      category={selectedCategory}
      categoryItems={mapListingsToViewModels(categoryPage, likedIds)}
      categoryTotal={categoryTotal}
      humanLabel={humanLabel}
      likedIds={likedIds}
      pageSize={pageSize}
      searchQuery={searchQuery}
      seed={seed}
      signed={signed}
      sort={sortValue}
      userLabel={userLabel}
      verifiedOnly={verifiedOnly}
      />
    </>
  );
}
