import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { ListingDetailView } from "../../../src/features/listings/components/listing-detail-view";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { getListing } from "../../../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

type ListingPageProps = {
  params: Promise<{
    listingId: string;
  }>;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { listingId } = await params;
  const [currentUser, listing] = await Promise.all([getCurrentUser(), getListing(listingId)]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell activeSection="catalog" humanLabel={humanLabel} userLabel={userLabel}>
      <PageHeader
        actions={listing !== undefined ? undefined : undefined}
        description="Inspect listing details, buyer action, and Human Signature status from one place."
        eyebrow="Listing"
        title={listing?.title ?? "Listing detail"}
      />
      <ListingDetailView currentUser={currentUser} listing={listing} />
    </MarketplaceShell>
  );
}
