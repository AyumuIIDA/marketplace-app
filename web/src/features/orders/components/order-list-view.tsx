import { ActionButton } from "../../../components/ui/action-button";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { StatePanel } from "../../../components/ui/state-panel";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { Order } from "../../../lib/api/orders.api";

type OrderListViewProps = {
  orders: Order[];
};

export function OrderListView({ orders }: OrderListViewProps) {
  if (orders.length === 0) {
    return (
      <StatePanel actionHref="/" actionLabel="Browse catalog" title="No orders yet">
        Purchases and sales will appear here after a listing is bought.
      </StatePanel>
    );
  }

  return (
    <div className="grid gap-3">
      {orders.map((order) => (
        <GlassPanel className="p-4" key={order.orderId}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone={order.status === "COMPLETED" ? "good" : "neutral"}>{order.status}</StatusBadge>
                <span className="text-xs font-medium text-neutral-400">{order.orderId}</span>
              </div>
              <h2 className="text-base font-semibold text-neutral-950">Listing {order.listingId}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {order.price.toLocaleString("ja-JP")} {order.currency}
              </p>
            </div>
            <ActionButton href={`/orders/${order.orderId}`} variant="primary">
              Open
            </ActionButton>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
