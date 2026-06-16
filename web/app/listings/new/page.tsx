import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { ListingForm } from "../../../src/features/listings/components/listing-form";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const currentUser = await getCurrentUser();
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell activeSection="catalog" humanLabel={humanLabel} userLabel={userLabel}>
      <PageHeader title="Create listing" />
      {currentUser === undefined ? (
        <StatePanel actionHref="/api/auth/signin" actionLabel="Sign in" title="Sign in required">
          Sign in to create a listing.
        </StatePanel>
      ) : (
        <ListingForm />
      )}
    </MarketplaceShell>
  );
}
