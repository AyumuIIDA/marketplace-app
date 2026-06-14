import { MarketplaceHomeView } from "../src/features/marketplace-home/components/marketplace-home-view";
import { catalogItemFixtures } from "../src/features/listings/fixtures/catalog-items.fixture";
import { mapListingsToViewModels } from "../src/features/listings/listing.mapper";
import { getCurrentUser } from "../src/lib/api/current-user.api";
import { searchListings } from "../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [currentUser, apiListings] = await Promise.all([getCurrentUser(), searchListings({ limit: 12 })]);
  const listings = apiListings.length > 0 ? mapListingsToViewModels(apiListings) : catalogItemFixtures;
  const userLabel = currentUser?.displayName ?? "Guest preview";
  const humanLabel =
    currentUser === undefined ? "Link after sign in" : currentUser.humanVerified ? "Verified" : "Not linked";

  return <MarketplaceHomeView humanLabel={humanLabel} listings={listings} userLabel={userLabel} />;
}
