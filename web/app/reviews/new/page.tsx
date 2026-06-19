import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { ReviewForm } from "../../../src/features/reviews/components/review-form";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";

export const dynamic = "force-dynamic";

type NewReviewPageProps = {
  searchParams: Promise<{
    orderId?: string;
  }>;
};

export default async function NewReviewPage({ searchParams }: NewReviewPageProps) {
  const [{ orderId }, currentUser, t] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getTranslations("pages.review"),
  ]);
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="orders"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel} humanVerified={humanVerified}
      userLabel={userLabel}
    >
      <PageHeader title={t("title")} />
      {currentUser === undefined ? (
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      ) : (
        <ReviewForm orderId={orderId} />
      )}
    </MarketplaceShell>
  );
}
