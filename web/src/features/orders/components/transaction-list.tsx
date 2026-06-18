import { getTranslations } from "next-intl/server";

import { StatusBadge } from "../../../components/ui/status-badge";
import type { Order } from "../../../lib/api/orders.api";
import { shortRef } from "../../../lib/format/id";

type TransactionListProps = {
  orders: Order[];
  currentUserId: string;
  emptyLabel: string;
};

const STEPS = ["paidAt", "shippedAt", "receivedAt", "completedAt"] as const;

/*
  取引行リスト。買い手(購入)と売り手(取引中)で共用し、各行は取引状況ページ /orders/[orderId] へ導線する。
  状態バッジ＋4段ミニ進捗で「いまどの段階か」を一目化する（商品名/写真は遷移先の取引状況ページで見せる。
  取引相手の SOLD 出品は閲覧権限が無く一覧では取得しない＝余計なAPIと403を避ける）。
*/
export async function TransactionList({ currentUserId, emptyLabel, orders }: TransactionListProps) {
  const t = await getTranslations("transaction");

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-soft">{emptyLabel}</p>;
  }

  return (
    <ul className="grid gap-3">
      {orders.map((order) => {
        const role = order.buyerId === currentUserId ? t("buyer") : t("seller");
        const canceled = order.status === "CANCELED";
        const tone = order.status === "COMPLETED" ? "good" : canceled ? "warn" : "neutral";

        return (
          <li key={order.orderId}>
            <a
              className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              href={`/orders/${order.orderId}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={tone}>{t(`status.${order.status}`)}</StatusBadge>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">{role}</span>
                  <span className="font-mono text-[11px] text-ink-faint">{shortRef(order.orderId)}</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  {canceled ? (
                    <span className="text-xs text-ink-faint">{formatDate(order.createdAt)}</span>
                  ) : (
                    <MiniProgress order={order} />
                  )}
                  <span className="shrink-0 font-mono text-base font-semibold text-ink">
                    ¥{order.price.toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>

              <span className="shrink-0 self-center text-xs font-semibold text-seal-strong">{t("viewStatus")} →</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// 4段の進捗ドット。タイムスタンプが入った段階まで朱で塗る。
function MiniProgress({ order }: { order: Order }) {
  const reached = STEPS.filter((step) => order[step] !== undefined).length;

  return (
    <span aria-hidden className="flex items-center gap-1">
      {STEPS.map((step, index) => (
        <span className="flex items-center gap-1" key={step}>
          <span className={index < reached ? "size-2 rounded-full bg-seal" : "size-2 rounded-full bg-line-strong"} />
          {index < STEPS.length - 1 && (
            <span className={index < reached - 1 ? "h-px w-5 bg-seal" : "h-px w-5 bg-line-strong"} />
          )}
        </span>
      ))}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(value));
}
