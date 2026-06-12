import type { Order } from "../domain/index.js";
import type { OrderStatus } from "../domain/index.js";

export type OrderOutput = {
  orderId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  price: number;
  currency: "JPY";
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  canceledAt?: string;
};

export function toOrderOutput(order: Order): OrderOutput {
  const snapshot = order.snapshot;

  return {
    orderId: snapshot.id,
    listingId: snapshot.listingId,
    buyerId: snapshot.buyerId,
    sellerId: snapshot.sellerId,
    status: snapshot.status,
    price: snapshot.price,
    currency: snapshot.currency,
    createdAt: snapshot.createdAt.toISOString(),
    paidAt: snapshot.paidAt?.toISOString(),
    shippedAt: snapshot.shippedAt?.toISOString(),
    receivedAt: snapshot.receivedAt?.toISOString(),
    completedAt: snapshot.completedAt?.toISOString(),
    canceledAt: snapshot.canceledAt?.toISOString(),
  };
}
