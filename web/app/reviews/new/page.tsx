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
  const [{ orderId }, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell activeSection="orders" humanLabel={humanLabel} userLabel={userLabel}>
      <PageHeader title="Write review" />
      {currentUser === undefined ? (
        <StatePanel actionHref="/api/auth/signin" actionLabel="Sign in" title="Sign in required">
          Sign in to write a review.
        </StatePanel>
      ) : (
        <ReviewForm orderId={orderId} />
      )}
    </MarketplaceShell>
  );
}
