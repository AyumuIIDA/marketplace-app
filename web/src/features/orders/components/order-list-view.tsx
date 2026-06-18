import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { StatePanel } from "../../../components/ui/state-panel";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { Order } from "../../../lib/api/orders.api";

type OrderListViewProps = {
  orders: Order[];
};

export async function OrderListView({ orders }: OrderListViewProps) {
  const t = await getTranslations("orderList");

  if (orders.length === 0) {
    return (
      <StatePanel actionHref="/" actionLabel={t("emptyAction")} title={t("emptyTitle")}>
        {t("emptyBody")}
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
                <span className="font-mono text-xs text-ink-faint">{order.orderId}</span>
              </div>
              <p className="font-mono text-base font-semibold text-ink">
                ¥{order.price.toLocaleString("ja-JP")}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-ink-soft">{order.listingId}</p>
            </div>
            <ActionButton href={`/orders/${order.orderId}`} variant="secondary">
              {t("open")}
            </ActionButton>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
