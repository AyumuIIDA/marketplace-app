import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../src/components/layout/page-header";
import { ActionButton } from "../../src/components/ui/action-button";
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
  const [currentUser, listings, t, social] = await Promise.all([
    getCurrentUser(),
    searchMyListings({ limit: 12 }),
    getTranslations("pages.me"),
    getTranslations("social"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="me"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <PageHeader title={t("title")} />
      {currentUser === undefined ? (
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      ) : (
        <div className="space-y-6">
          <GlassPanel className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge tone={currentUser.status === "ACTIVE" ? "good" : "warn"}>{currentUser.status}</StatusBadge>
              <StatusBadge tone={currentUser.humanVerified ? "seal" : "warn"}>
                {currentUser.humanVerified ? t("worldIdLinked") : t("worldIdUnlinked")}
              </StatusBadge>
            </div>
            <dl className="rounded-md border border-line bg-paper p-4">
              <DetailRow label={t("name")} value={currentUser.displayName} />
              <DetailRow label={t("userId")} mono value={currentUser.userId} />
              <DetailRow label={t("email")} value={currentUser.email ?? t("notProvided")} />
            </dl>
            {!currentUser.humanVerified && (
              <div className="mt-5">
                <WorldIdButton action="account-link" label={t("linkWorldId")} />
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{t("orders")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("ordersBody")}</p>
            </div>
            <ActionButton href="/orders" variant="secondary">
              {t("ordersAction")}
            </ActionButton>
          </GlassPanel>

          <section>
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="text-sm font-semibold text-ink">{t("myListings")}</h2>
            </div>
            {listings.length === 0 ? (
              <StatePanel actionHref="/listings/new" actionLabel={t("emptyAction")} title={t("emptyTitle")}>
                {t("emptyBody")}
              </StatePanel>
            ) : (
              <ListingGrid listings={mapListingsToViewModels(listings)} />
            )}
          </section>

          {/* いいね一覧。データ供給はbackend実装後（social-features-backend-iayu6.md）。 */}
          <section>
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="text-sm font-semibold text-ink">{social("likedItems")}</h2>
            </div>
            <p className="text-sm text-ink-soft">{social("likedItemsEmpty")}</p>
          </section>

          <section>
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="text-sm font-semibold text-ink">{social("likedSellers")}</h2>
            </div>
            <p className="text-sm text-ink-soft">{social("likedSellersEmpty")}</p>
          </section>
        </div>
      )}
    </MarketplaceShell>
  );
}
