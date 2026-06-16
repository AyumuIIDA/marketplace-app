import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../src/components/layout/page-header";
import { DetailRow } from "../../src/components/ui/detail-row";
import { GlassPanel } from "../../src/components/ui/glass-panel";
import { StatePanel } from "../../src/components/ui/state-panel";
import { StatusBadge } from "../../src/components/ui/status-badge";
import { toShellUserLabels } from "../../src/features/current-user/shell-user";
import { ListingGrid } from "../../src/features/listings/components/listing-grid";
import { mapListingsToViewModels } from "../../src/features/listings/listing.mapper";
import { WorldIdButton } from "../../src/features/world-id/components/world-id-button";
import { getCurrentUser } from "../../src/lib/api/current-user.api";
import { searchMyListings } from "../../src/lib/api/listings.api";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const [currentUser, listings] = await Promise.all([getCurrentUser(), searchMyListings({ limit: 12 })]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell activeSection="me" humanLabel={humanLabel} userLabel={userLabel}>
      <PageHeader title="Account" />
      {currentUser === undefined ? (
        <StatePanel actionHref="/api/auth/signin" actionLabel="Sign in" title="Sign in required">
          Sign in to view your account.
        </StatePanel>
      ) : (
        <div className="space-y-6">
          <GlassPanel className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge tone={currentUser.status === "ACTIVE" ? "good" : "warn"}>{currentUser.status}</StatusBadge>
              <StatusBadge tone={currentUser.humanVerified ? "good" : "warn"}>
                {currentUser.humanVerified ? "World ID linked" : "World ID not linked"}
              </StatusBadge>
            </div>
            <dl className="rounded-[24px] bg-white/72 p-4">
              <DetailRow label="Name" value={currentUser.displayName} />
              <DetailRow label="User ID" value={currentUser.userId} />
              <DetailRow label="Email" value={currentUser.email ?? "Not provided"} />
            </dl>
            {!currentUser.humanVerified && (
              <div className="mt-5">
                <WorldIdButton action="ACCOUNT_LINK" label="Link World ID" />
              </div>
            )}
          </GlassPanel>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-500">My listings</h2>
            </div>
            {listings.length === 0 ? (
              <StatePanel actionHref="/listings/new" actionLabel="Create listing" title="No listings yet">
                Create your first listing.
              </StatePanel>
            ) : (
              <ListingGrid listings={mapListingsToViewModels(listings)} />
            )}
          </section>
        </div>
      )}
    </MarketplaceShell>
  );
}
