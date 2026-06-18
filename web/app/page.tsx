import { MarketplaceHomeView } from "../src/features/marketplace-home/components/marketplace-home-view";
import { toShellUserLabels } from "../src/features/current-user/shell-user";
import { parseListingSort } from "../src/features/listings/listing-sort";
import { mapListingsToViewModels } from "../src/features/listings/listing.mapper";
import { getCurrentUser } from "../src/lib/api/current-user.api";
import { searchListings } from "../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    keyword?: string;
    sort?: string;
    category?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { category, keyword, sort } = await searchParams;
  const trimmedKeyword = keyword?.trim();
  const searchQuery = trimmedKeyword === undefined || trimmedKeyword.length === 0 ? undefined : trimmedKeyword;
  const trimmedCategory = category?.trim();
  const selectedCategory = trimmedCategory === undefined || trimmedCategory.length === 0 ? undefined : trimmedCategory;
  const pageSize = 24;
  const [currentUser, apiListings, categoryPage] = await Promise.all([
    getCurrentUser(),
    searchListings({ keyword: searchQuery, limit: 60 }),
    selectedCategory === undefined
      ? Promise.resolve([])
      : searchListings({ keyword: searchQuery, category: selectedCategory, limit: pageSize }),
  ]);
  const listings = mapListingsToViewModels(apiListings);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceHomeView
      authenticated={currentUser !== undefined}
      category={selectedCategory}
      categoryItems={mapListingsToViewModels(categoryPage)}
      humanLabel={humanLabel}
      listings={listings}
      pageSize={pageSize}
      searchQuery={searchQuery}
      sort={parseListingSort(sort)}
      userLabel={userLabel}
    />
  );
}
