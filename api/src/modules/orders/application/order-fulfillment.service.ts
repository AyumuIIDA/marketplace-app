import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import type { Clock, IdGenerator } from "../../../shared/index.js";
import { Order, type OrderRepository } from "../domain/index.js";

import { toOrderOutput, type OrderOutput } from "./order.presenter.js";

export type OrderContext = {
  orderRepository: OrderRepository;
};

export type CreatePaidOrderInput = {
  listingId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  currency?: "JPY";
};

export type OrderFulfillmentServiceDeps = {
  idGenerator: IdGenerator;
  clock: Clock;
};

export class OrderFulfillmentService {
  constructor(private readonly deps: OrderFulfillmentServiceDeps) {}

  async createPaidOrder(input: CreatePaidOrderInput, context: OrderContext): Promise<OrderOutput> {
    const existing = await context.orderRepository.findByListingId(input.listingId);

    if (existing !== undefined) {
      throw new AuthorizationError("This listing already has an order.", {
        listingId: input.listingId,
        orderId: existing.id,
      });
    }

    const order = Order.createPaid({
      id: this.deps.idGenerator.newId(),
      listingId: input.listingId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      price: input.price,
      currency: input.currency,
      now: this.deps.clock.now(),
    });

    await context.orderRepository.save(order);

    return toOrderOutput(order);
  }

  async getOrderForParticipant(
    input: { orderId: string; participantId: string },
    context: OrderContext,
  ): Promise<Order> {
    const order = await context.orderRepository.findById(input.orderId);

    if (order === undefined) {
      throw new NotFoundError("Order", input.orderId);
    }

    if (order.buyerId !== input.participantId && order.sellerId !== input.participantId) {
      throw new AuthorizationError("Only order participants can access this order.", {
        orderId: input.orderId,
        participantId: input.participantId,
      });
    }

    return order;
  }
}
