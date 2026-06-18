import { DiscoverView } from "../../src/features/discover/components/discover-view";
import { mapListingsToViewModels } from "../../src/features/listings/listing.mapper";
import { searchListings } from "../../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const listings = await searchListings({ limit: 12 });

  return <DiscoverView initial={mapListingsToViewModels(listings)} />;
}
