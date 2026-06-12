import type { Clock } from "../../../shared/index.js";

import { toOrderOutput, type OrderOutput } from "./order.presenter.js";
import { OrderFulfillmentService, type OrderContext } from "./order-fulfillment.service.js";

export type MarkOrderReceivedInput = {
  orderId: string;
  buyerId: string;
};

export type MarkOrderReceivedOutput = OrderOutput;

export type MarkOrderReceivedDeps = {
  orderFulfillmentService: OrderFulfillmentService;
  orderContext: OrderContext;
  clock: Clock;
};

export class MarkOrderReceivedUseCase {
  constructor(private readonly deps: MarkOrderReceivedDeps) {}

  async execute(input: MarkOrderReceivedInput): Promise<MarkOrderReceivedOutput> {
    const order = await this.deps.orderFulfillmentService.getOrderForParticipant(
      {
        orderId: input.orderId,
        participantId: input.buyerId,
      },
      this.deps.orderContext,
    );

    order.markReceived(input.buyerId, this.deps.clock.now());
    await this.deps.orderContext.orderRepository.save(order);

    return toOrderOutput(order);
  }
}
