import type { Order } from "./order.entity.js";
import type { OrderStatus } from "./order-status.type.js";

export type SearchOrdersInput = {
  participantId?: string;
  buyerId?: string;
  sellerId?: string;
  status?: OrderStatus;
  limit?: number;
};

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(orderId: string): Promise<Order | undefined>;
  findByListingId(listingId: string): Promise<Order | undefined>;
  search(input: SearchOrdersInput): Promise<Order[]>;
}
