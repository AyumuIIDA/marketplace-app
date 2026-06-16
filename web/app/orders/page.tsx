import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../src/components/layout/page-header";
import { toShellUserLabels } from "../../src/features/current-user/shell-user";
import { OrderListView } from "../../src/features/orders/components/order-list-view";
import { getCurrentUser } from "../../src/lib/api/current-user.api";
import { listOrders } from "../../src/lib/api/orders.api";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [currentUser, orders] = await Promise.all([getCurrentUser(), listOrders({ limit: 50 })]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell activeSection="orders" humanLabel={humanLabel} userLabel={userLabel}>
      <PageHeader title="Orders" />
      <OrderListView orders={orders} />
    </MarketplaceShell>
  );
}
