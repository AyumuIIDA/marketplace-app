import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { StatePanel } from "../../../components/ui/state-panel";
import type { Order } from "../../../lib/api/orders.api";
import { TransactionList } from "../../orders/components/transaction-list";
import type { ListingViewModel } from "../listing-view-model";
import { ListingGrid } from "./listing-grid";

type SellerDashboardProps = {
  listings: ListingViewModel[];
  orders: Order[];
  currentUserId: string;
};

// 自分の出品ダッシュボード。下書き/出品中/取引中の件数サマリ＋取引中リスト＋出品中タイル＋
// 画面下部の固定「出品する」ボタン（listing-form の sticky バーと同じ意匠）。
export async function SellerDashboard({ currentUserId, listings, orders }: SellerDashboardProps) {
  const t = await getTranslations("sell");
  const tx = await getTranslations("transaction");

  const drafts = listings.filter((item) => item.status === "DRAFT");
  const published = listings.filter((item) => item.status === "PUBLISHED");
  // 取引中＝自分が売り手で、まだ完了/キャンセルしていない注文。取引状況ページへ導線する。
  const inTransaction = orders.filter(
    (order) => order.sellerId === currentUserId && order.status !== "COMPLETED" && order.status !== "CANCELED",
  );

  const stats = [
    { label: t("statDraft"), count: drafts.length, highlight: false },
    { label: t("statPublished"), count: published.length, highlight: true },
    { label: t("statInTransaction"), count: inTransaction.length, highlight: false },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            className={
              stat.highlight
                ? "rounded-lg border border-seal/40 bg-seal-tint p-4 text-center"
                : "rounded-lg border border-line bg-surface p-4 text-center"
            }
            key={stat.label}
          >
            <p
              className={
                stat.highlight
                  ? "font-mono text-2xl font-bold text-seal-strong"
                  : "font-mono text-2xl font-bold text-ink"
              }
            >
              {stat.count}
            </p>
            <p className="mt-1 text-xs font-medium text-ink-soft">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="text-sm font-semibold text-ink">{t("inTransactionTitle")}</h2>
          <span className="font-mono text-xs text-ink-faint">{inTransaction.length}</span>
        </div>
        <TransactionList currentUserId={currentUserId} emptyLabel={tx("emptySales")} orders={inTransaction} />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="text-sm font-semibold text-ink">{t("publishedTitle")}</h2>
          <span className="font-mono text-xs text-ink-faint">{published.length}</span>
        </div>
        {listings.length === 0 ? (
          <StatePanel actionHref="/listings/new" actionLabel={t("createCta")} title={t("emptyTitle")}>
            {t("emptyBody")}
          </StatePanel>
        ) : published.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">{t("publishedEmpty")}</p>
        ) : (
          <ListingGrid listings={published} />
        )}
      </section>

      <div className="sticky bottom-0 mt-8 flex justify-end border-t border-line bg-paper/95 py-3 backdrop-blur-sm">
        <ActionButton href="/listings/new" variant="primary">
          {t("createCta")}
        </ActionButton>
      </div>
    </div>
  );
}
