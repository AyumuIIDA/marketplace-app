import { bffJson, isBffError } from "./bff-client";

export type Order = {
  orderId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: "PAID" | "SHIPPED" | "RECEIVED" | "COMPLETED" | "CANCELED";
  price: number;
  currency: "JPY";
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  canceledAt?: string;
};

export async function listOrders(input: { limit?: number } = {}): Promise<Order[]> {
  const params = new URLSearchParams();

  if (input.limit !== undefined) {
    params.set("limit", input.limit.toString());
  }

  try {
    const output = await bffJson<{ items: Order[] }>(
      `/orders${params.size > 0 ? `?${params.toString()}` : ""}`,
    );

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  try {
    return await bffJson<Order>(`/orders/${orderId}`);
  } catch (error) {
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return undefined;
    }

    throw error;
  }
}

export async function markOrderShipped(orderId: string): Promise<Order> {
  return bffJson<Order>(`/orders/${orderId}/ship`, { method: "POST" });
}

export async function markOrderReceived(orderId: string): Promise<Order> {
  return bffJson<Order>(`/orders/${orderId}/receive`, { method: "POST" });
}
