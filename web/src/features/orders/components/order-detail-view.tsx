import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { Avatar } from "../../../components/ui/avatar";
import { BackLink } from "../../../components/ui/back-link";
import { DetailRow } from "../../../components/ui/detail-row";
import { FormField, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { StatePanel } from "../../../components/ui/state-panel";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { CurrentUser } from "../../../lib/api/current-user.api";
import type { Message } from "../../../lib/api/messages.api";
import type { Order } from "../../../lib/api/orders.api";
import { getSellerSummary } from "../../../lib/api/sellers.api";
import { shortRef } from "../../../lib/format/id";
import type { Review } from "../../../lib/api/reviews.api";
import { SubmitReviewButton } from "../../reviews/components/submit-review-button";
import {
  hideOrderMessageAction,
  markOrderReceivedAction,
  markOrderShippedAction,
  sendOrderMessageAction,
} from "../actions/order.actions";

type OrderDetailViewProps = {
  currentUser: CurrentUser | undefined;
  messages: Message[];
  order: Order | undefined;
  reviews: Review[];
};

export async function OrderDetailView({ currentUser, messages, order, reviews }: OrderDetailViewProps) {
  const t = await getTranslations("orderDetail");

  if (order === undefined) {
    return (
      <StatePanel actionHref="/me" actionLabel={t("backAction")} title={t("unavailableTitle")}>
        {t("unavailableBody")}
      </StatePanel>
    );
  }

  const isSeller = currentUser?.userId === order.sellerId;
  const isBuyer = currentUser?.userId === order.buyerId;
  const canShip = isSeller && order.status === "PAID";
  const canReceive = isBuyer && order.status === "SHIPPED";
  const canReview = currentUser !== undefined && (order.status === "RECEIVED" || order.status === "COMPLETED");

  // 商品（タイトル/写真）は注文に焼き付けたスナップショットを使う。SOLD 化後も live listing を取得せず
  // （=403を踏まず）「何を買ったか」を見せる。取引相手（表示名）は別途取得する。
  const counterpartyId = isSeller ? order.buyerId : order.sellerId;
  const counterparty = await getSellerSummary(counterpartyId);
  const counterpartyLabel = isSeller ? t("buyer") : t("seller");

  return (
    <div className="space-y-5">
      <BackLink href="/me" label={t("backAction")} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <GlassPanel className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone={order.status === "COMPLETED" ? "good" : "neutral"}>{order.status}</StatusBadge>
            <span className="font-mono text-xs text-ink-faint">{shortRef(order.orderId)}</span>
          </div>
          <h2 className="sr-only">{t("heading")}</h2>
          <a
            className="flex items-center gap-3 rounded-md border border-line bg-paper p-3 transition-colors hover:border-ink/30"
            href={`/listings/${order.listingId}`}
          >
            {order.listingImageUrl.length > 0 ? (
              // 商品画像はブラウザが storage を直接読む公開アセット
              <img alt="" className="size-16 shrink-0 rounded-md object-cover" src={order.listingImageUrl} />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-md bg-surface font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                no photo
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {order.listingTitle.length > 0 ? order.listingTitle : t("item")}
              </span>
              <span className="mt-0.5 block font-mono text-sm text-ink-soft">
                ¥{order.price.toLocaleString("ja-JP")}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-seal-strong">{t("viewListing")} →</span>
          </a>
          <dl className="mt-4 rounded-md border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-4 border-b border-line py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                {counterpartyLabel}
              </dt>
              <dd>
                <a className="flex items-center gap-2 hover:underline" href={`/sellers/${counterpartyId}`}>
                  <Avatar
                    alt=""
                    className="size-6"
                    seed={counterparty.displayName || counterparty.handle}
                    src={counterparty.avatarUrl}
                  />
                  <span className="text-sm font-medium text-ink">{counterparty.displayName}</span>
                </a>
              </dd>
            </div>
            <DetailRow label={t("created")} value={formatDate(order.createdAt)} />
          </dl>
          <div className="mt-4">
            <ActionButton href={`/messages/${counterpartyId}`} variant="secondary">
              {t("sendMessage")}
            </ActionButton>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-ink">{t("messages")}</h3>
          <div className="mt-4 space-y-3">
            {messages.length === 0 && <p className="text-sm text-ink-soft">{t("noMessages")}</p>}
            {messages.map((message) => (
              <div className="rounded-md border border-line bg-paper p-4" key={message.messageId}>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-ink-faint">
                  <span className={message.senderId === currentUser?.userId ? "font-semibold text-ink" : "font-medium text-ink-soft"}>
                    {message.senderId === currentUser?.userId
                      ? t("you")
                      : message.senderId === counterpartyId
                        ? counterparty.displayName
                        : shortRef(message.senderId)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{formatDate(message.createdAt)}</span>
                    {currentUser !== undefined && (
                      <form action={hideOrderMessageAction}>
                        <input name="orderId" type="hidden" value={order.orderId} />
                        <input name="messageId" type="hidden" value={message.messageId} />
                        <button
                          className="text-ink-faint underline-offset-2 transition-colors hover:text-seal hover:underline"
                          type="submit"
                        >
                          {t("hideMessage")}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-6 text-ink">{message.body}</p>
              </div>
            ))}
          </div>
          {currentUser !== undefined && (
            <form action={sendOrderMessageAction} className="mt-4 grid gap-3">
              <input name="orderId" type="hidden" value={order.orderId} />
              <FormField label={t("messageLabel")}>
                <textarea className={textareaClassName} name="body" placeholder={t("messagePlaceholder")} required />
              </FormField>
              <div className="flex justify-end">
                <ActionButton type="submit" variant="primary">
                  {t("send")}
                </ActionButton>
              </div>
            </form>
          )}
        </GlassPanel>
      </div>

      <div className="space-y-4">
        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-ink">{t("lifecycle")}</h3>
          <div className="mt-4 grid gap-2">
            <LifecycleStep active={order.paidAt !== undefined} label={t("paid")} />
            <LifecycleStep active={order.shippedAt !== undefined} label={t("shipped")} />
            <LifecycleStep active={order.receivedAt !== undefined} label={t("received")} />
            <LifecycleStep active={order.completedAt !== undefined} label={t("completed")} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {canShip && (
              <form action={markOrderShippedAction}>
                <input name="orderId" type="hidden" value={order.orderId} />
                <ActionButton type="submit" variant="primary">
                  {t("markShipped")}
                </ActionButton>
              </form>
            )}
            {canReceive && (
              <form action={markOrderReceivedAction}>
                <input name="orderId" type="hidden" value={order.orderId} />
                <ActionButton type="submit" variant="primary">
                  {t("markReceived")}
                </ActionButton>
              </form>
            )}
            {canReview && (
              <ActionButton href={`/reviews/new?orderId=${order.orderId}`} variant="accent">
                {t("writeReview")}
              </ActionButton>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-ink">{t("reviews")}</h3>
          <div className="mt-4 space-y-3">
            {reviews.length === 0 && <p className="text-sm text-ink-soft">{t("noReviews")}</p>}
            {reviews.map((review) => (
              <div className="rounded-md border border-line bg-paper p-3" key={review.reviewId}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge tone={review.status === "SUBMITTED" ? "good" : "warn"}>{review.status}</StatusBadge>
                  <span className="font-mono text-xs font-semibold text-ink-soft">{review.rating}/5</span>
                </div>
                <p className="text-sm leading-6 text-ink">{review.comment}</p>
                {review.status === "DRAFT" && review.reviewerId === currentUser?.userId && (
                  <div className="mt-3">
                    <SubmitReviewButton review={review} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
      </div>
    </div>
  );
}

function LifecycleStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={active ? "size-2 rounded-full bg-ok" : "size-2 rounded-full bg-line-strong"} />
      <span className={active ? "font-semibold text-ink" : "text-ink-soft"}>{label}</span>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
