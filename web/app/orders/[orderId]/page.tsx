import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { OrderDetailView } from "../../../src/features/orders/components/order-detail-view";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { listOrderMessages } from "../../../src/lib/api/messages.api";
import { getOrder } from "../../../src/lib/api/orders.api";
import { listReviews } from "../../../src/lib/api/reviews.api";

export const dynamic = "force-dynamic";

type OrderPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  const [currentUser, order, messages, reviews, t] = await Promise.all([
    getCurrentUser(),
    getOrder(orderId),
    listOrderMessages(orderId),
    listReviews({ orderId, limit: 20 }),
    getTranslations("pages.orderDetail"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="orders"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <OrderDetailView currentUser={currentUser} messages={messages} order={order} reviews={reviews} />
    </MarketplaceShell>
  );
}
