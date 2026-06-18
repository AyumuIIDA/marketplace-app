import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { ListingForm } from "../../../src/features/listings/components/listing-form";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { ensureOnboarded } from "../../../src/lib/auth/onboarding";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  await ensureOnboarded("/listings/new");
  const [currentUser, t] = await Promise.all([getCurrentUser(), getTranslations("pages.sell")]);
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
        <ListingForm />
      )}
    </MarketplaceShell>
  );
}
