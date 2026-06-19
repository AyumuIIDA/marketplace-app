import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { ListingDetailView } from "../../../src/features/listings/components/listing-detail-view";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { getListing } from "../../../src/lib/api/listings.api";
import { getLikedListingIds } from "../../../src/lib/api/social.api";

export const dynamic = "force-dynamic";

type ListingPageProps = {
  params: Promise<{
    listingId: string;
  }>;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { listingId } = await params;
  const [currentUser, listing, likedIds] = await Promise.all([
    getCurrentUser(),
    getListing(listingId),
    getLikedListingIds(),
  ]);
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel} humanVerified={humanVerified}
      userLabel={userLabel}
    >
      <ListingDetailView currentUser={currentUser} initialLiked={likedIds.has(listingId)} listing={listing} />
    </MarketplaceShell>
  );
}
