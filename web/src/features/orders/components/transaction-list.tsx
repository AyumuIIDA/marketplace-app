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
  商品名/写真は注文に焼き付けたスナップショット(listingTitle/listingImageUrl)を表示する。
  これにより SOLD 化後でも live listing を取得せず（=余計なAPIと403を避け）「何を買ったか」が一覧で分かる。
*/
export async function TransactionList({ currentUserId, emptyLabel, orders }: TransactionListProps) {
  const t = await getTranslations("transaction");

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-soft">{emptyLabel}</p>;
  }

  return (
    // flex-col にする（grid の min-width:auto トラックが長いタイトルで横へ伸び、truncate を無効化して
    // ページ全体が横スクロールするのを防ぐ）。
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const role = order.buyerId === currentUserId ? t("buyer") : t("seller");
        const canceled = order.status === "CANCELED";
        const tone = order.status === "COMPLETED" ? "good" : canceled ? "warn" : "neutral";

        return (
          <li key={order.orderId}>
            <a
              className="flex min-w-0 items-center gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              href={`/orders/${order.orderId}`}
            >
              <Thumbnail title={order.listingTitle} url={order.listingImageUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={tone}>{t(`status.${order.status}`)}</StatusBadge>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">{role}</span>
                  <span className="font-mono text-[11px] text-ink-faint">{shortRef(order.orderId)}</span>
                </div>
                {order.listingTitle.length > 0 && (
                  <p className="mt-1.5 truncate text-sm font-semibold text-ink">{order.listingTitle}</p>
                )}
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

// 注文に焼き付けた商品サムネ。URL が空（旧注文/画像なし）なら no photo プレースホルダ。
function Thumbnail({ title, url }: { title: string; url: string }) {
  if (url.length === 0) {
    return (
      <span className="grid size-14 shrink-0 place-items-center rounded-md bg-paper font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        no photo
      </span>
    );
  }
  // 商品画像はブラウザが storage を直接読む公開アセット
  return <img alt={title} className="size-14 shrink-0 rounded-md object-cover" src={url} />;
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
