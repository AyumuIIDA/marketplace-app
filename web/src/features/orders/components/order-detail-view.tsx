import { ActionButton } from "../../../components/ui/action-button";
import { DetailRow } from "../../../components/ui/detail-row";
import { FormField, textareaClassName } from "../../../components/ui/form-field";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { StatePanel } from "../../../components/ui/state-panel";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { CurrentUser } from "../../../lib/api/current-user.api";
import type { Message } from "../../../lib/api/messages.api";
import type { Order } from "../../../lib/api/orders.api";
import type { Review } from "../../../lib/api/reviews.api";
import { SubmitReviewButton } from "../../reviews/components/submit-review-button";
import {
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

export function OrderDetailView({ currentUser, messages, order, reviews }: OrderDetailViewProps) {
  if (order === undefined) {
    return (
      <StatePanel actionHref="/orders" actionLabel="Back to orders" title="Order is not available">
        Sign in with the buyer or seller account to view this order.
      </StatePanel>
    );
  }

  const isSeller = currentUser?.userId === order.sellerId;
  const isBuyer = currentUser?.userId === order.buyerId;
  const canShip = isSeller && order.status === "PAID";
  const canReceive = isBuyer && order.status === "SHIPPED";
  const canReview = currentUser !== undefined && (order.status === "RECEIVED" || order.status === "COMPLETED");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <GlassPanel className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={order.status === "COMPLETED" ? "good" : "neutral"}>{order.status}</StatusBadge>
            <span className="text-xs font-medium text-neutral-400">{order.orderId}</span>
          </div>
          <h2 className="text-2xl font-semibold text-neutral-950">Order for listing {order.listingId}</h2>
          <dl className="mt-6 rounded-[24px] bg-white/72 p-4">
            <DetailRow label="Price" value={`${order.price.toLocaleString("ja-JP")} ${order.currency}`} />
            <DetailRow label="Buyer" value={order.buyerId} />
            <DetailRow label="Seller" value={order.sellerId} />
            <DetailRow label="Created" value={formatDate(order.createdAt)} />
          </dl>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-neutral-950">Messages</h3>
          <div className="mt-4 space-y-3">
            {messages.length === 0 && <p className="text-sm text-neutral-500">No messages yet.</p>}
            {messages.map((message) => (
              <div className="rounded-[20px] bg-white/76 p-4" key={message.messageId}>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-400">
                  <span>{message.senderId === currentUser?.userId ? "You" : message.senderId}</span>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                <p className="text-sm leading-6 text-neutral-700">{message.body}</p>
              </div>
            ))}
          </div>
          {currentUser !== undefined && (
            <form action={sendOrderMessageAction} className="mt-4 grid gap-3">
              <input name="orderId" type="hidden" value={order.orderId} />
              <FormField label="Message">
                <textarea className={textareaClassName} name="body" placeholder="Send a transaction update." required />
              </FormField>
              <div className="flex justify-end">
                <ActionButton type="submit" variant="primary">
                  Send
                </ActionButton>
              </div>
            </form>
          )}
        </GlassPanel>
      </div>

      <div className="space-y-4">
        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-neutral-950">Lifecycle</h3>
          <div className="mt-4 grid gap-2">
            <LifecycleStep active={order.paidAt !== undefined} label="Paid" />
            <LifecycleStep active={order.shippedAt !== undefined} label="Shipped" />
            <LifecycleStep active={order.receivedAt !== undefined} label="Received" />
            <LifecycleStep active={order.completedAt !== undefined} label="Completed" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {canShip && (
              <form action={markOrderShippedAction}>
                <input name="orderId" type="hidden" value={order.orderId} />
                <ActionButton type="submit" variant="primary">
                  Mark shipped
                </ActionButton>
              </form>
            )}
            {canReceive && (
              <form action={markOrderReceivedAction}>
                <input name="orderId" type="hidden" value={order.orderId} />
                <ActionButton type="submit" variant="primary">
                  Mark received
                </ActionButton>
              </form>
            )}
            {canReview && (
              <ActionButton href={`/reviews/new?orderId=${order.orderId}`} variant="primary">
                Write review
              </ActionButton>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-neutral-950">Reviews</h3>
          <div className="mt-4 space-y-3">
            {reviews.length === 0 && <p className="text-sm text-neutral-500">No reviews have been drafted yet.</p>}
            {reviews.map((review) => (
              <div className="rounded-[18px] bg-white/76 p-3" key={review.reviewId}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge tone={review.status === "SUBMITTED" ? "good" : "warn"}>{review.status}</StatusBadge>
                  <span className="text-xs font-semibold text-neutral-500">{review.rating}/5</span>
                </div>
                <p className="text-sm leading-6 text-neutral-600">{review.comment}</p>
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
  );
}

function LifecycleStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={active ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-neutral-300"} />
      <span className={active ? "font-semibold text-neutral-900" : "text-neutral-500"}>{label}</span>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
