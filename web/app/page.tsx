import { MarketplaceHomeView } from "../src/features/marketplace-home/components/marketplace-home-view";
import { toShellUserLabels } from "../src/features/current-user/shell-user";
import { catalogItemFixtures } from "../src/features/listings/fixtures/catalog-items.fixture";
import { mapListingsToViewModels } from "../src/features/listings/listing.mapper";
import { getCurrentUser } from "../src/lib/api/current-user.api";
import { searchListings } from "../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    keyword?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { keyword } = await searchParams;
  const trimmedKeyword = keyword?.trim();
  const searchQuery = trimmedKeyword === undefined || trimmedKeyword.length === 0 ? undefined : trimmedKeyword;
  const [currentUser, apiListings] = await Promise.all([
    getCurrentUser(),
    searchListings({ keyword: searchQuery, limit: 12 }),
  ]);
  const listings = apiListings.length > 0 || searchQuery !== undefined ? mapListingsToViewModels(apiListings) : catalogItemFixtures;
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceHomeView
      humanLabel={humanLabel}
      listings={listings}
      searchQuery={searchQuery}
      userLabel={userLabel}
    />
  );
}
