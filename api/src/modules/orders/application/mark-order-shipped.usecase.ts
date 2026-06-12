import type { Clock } from "../../../shared/index.js";

import { toOrderOutput, type OrderOutput } from "./order.presenter.js";
import { OrderFulfillmentService, type OrderContext } from "./order-fulfillment.service.js";

export type MarkOrderShippedInput = {
  orderId: string;
  sellerId: string;
};

export type MarkOrderShippedOutput = OrderOutput;

export type MarkOrderShippedDeps = {
  orderFulfillmentService: OrderFulfillmentService;
  orderContext: OrderContext;
  clock: Clock;
};

export class MarkOrderShippedUseCase {
  constructor(private readonly deps: MarkOrderShippedDeps) {}

  async execute(input: MarkOrderShippedInput): Promise<MarkOrderShippedOutput> {
    const order = await this.deps.orderFulfillmentService.getOrderForParticipant(
      {
        orderId: input.orderId,
        participantId: input.sellerId,
      },
      this.deps.orderContext,
    );

    order.markShipped(input.sellerId, this.deps.clock.now());
    await this.deps.orderContext.orderRepository.save(order);

    return toOrderOutput(order);
  }
}
