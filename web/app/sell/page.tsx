import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../src/components/layout/page-header";
import { StatePanel } from "../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../src/features/current-user/shell-user";
import { SellerDashboard } from "../../src/features/listings/components/seller-dashboard";
import { mapListingsToViewModels } from "../../src/features/listings/listing.mapper";
import { getCurrentUser } from "../../src/lib/api/current-user.api";
import { searchMyListings } from "../../src/lib/api/listings.api";
import { listOrders } from "../../src/lib/api/orders.api";
import { ensureOnboarded } from "../../src/lib/auth/onboarding";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  await ensureOnboarded("/sell");
  const [currentUser, listings, orders, t] = await Promise.all([
    getCurrentUser(),
    searchMyListings({ limit: 100 }),
    listOrders({ limit: 100 }),
    getTranslations("sell"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="sell"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <PageHeader description={t("description")} title={t("title")} />
      {currentUser === undefined ? (
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      ) : (
        <SellerDashboard
          currentUserId={currentUser.userId}
          listings={mapListingsToViewModels(listings)}
          orders={orders}
        />
      )}
    </MarketplaceShell>
  );
}
