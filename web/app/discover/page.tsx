import { DiscoverView } from "../../src/features/discover/components/discover-view";
import { mapListingsToViewModels } from "../../src/features/listings/listing.mapper";
import { getCurrentUser } from "../../src/lib/api/current-user.api";
import { searchListings } from "../../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  // AI検索（相談モード）はログイン必須。未ログインは無言の空ではなくログイン誘導を出す。
  const [listings, currentUser] = await Promise.all([searchListings({ limit: 12 }), getCurrentUser()]);

  return <DiscoverView authenticated={currentUser !== undefined} initial={mapListingsToViewModels(listings)} />;
}
