import { MarketplaceHomeView } from "../src/features/marketplace-home/components/marketplace-home-view";
import { toShellUserLabels } from "../src/features/current-user/shell-user";
import { parseListingSort } from "../src/features/listings/listing-sort";
import { mapListingsToViewModels } from "../src/features/listings/listing.mapper";
import { getCurrentUser } from "../src/lib/api/current-user.api";
import { searchListings } from "../src/lib/api/listings.api";
import { getLikedListingIds } from "../src/lib/api/social.api";
import { ensureOnboarded } from "../src/lib/auth/onboarding";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    keyword?: string;
    sort?: string;
    category?: string;
    verified?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await ensureOnboarded("/");
  const { category, keyword, sort, verified } = await searchParams;
  const trimmedKeyword = keyword?.trim();
  const searchQuery = trimmedKeyword === undefined || trimmedKeyword.length === 0 ? undefined : trimmedKeyword;
  const trimmedCategory = category?.trim();
  const selectedCategory = trimmedCategory === undefined || trimmedCategory.length === 0 ? undefined : trimmedCategory;
  const verifiedOnly = verified === "1";
  const pageSize = 24;
  const [currentUser, apiListings, categoryPage, likedIds] = await Promise.all([
    getCurrentUser(),
    searchListings({ keyword: searchQuery, limit: 60 }),
    selectedCategory === undefined
      ? Promise.resolve([])
      : searchListings({ keyword: searchQuery, category: selectedCategory, limit: pageSize }),
    getLikedListingIds(),
  ]);
  // 署名フィルタは backend に signed パラメータが無いため取得集合で絞る（要: 将来のファセットAPI）。
  const filterSigned = (items: ReturnType<typeof mapListingsToViewModels>) =>
    verifiedOnly ? items.filter((item) => item.signed) : items;
  const listings = filterSigned(mapListingsToViewModels(apiListings, likedIds));
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceHomeView
      authenticated={currentUser !== undefined}
      category={selectedCategory}
      categoryItems={filterSigned(mapListingsToViewModels(categoryPage, likedIds))}
      humanLabel={humanLabel}
      listings={listings}
      pageSize={pageSize}
      searchQuery={searchQuery}
      sort={parseListingSort(sort)}
      userLabel={userLabel}
      verifiedOnly={verifiedOnly}
    />
  );
}
