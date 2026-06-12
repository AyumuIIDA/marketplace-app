import { toOrderOutput, type OrderOutput } from "./order.presenter.js";
import { OrderFulfillmentService, type OrderContext } from "./order-fulfillment.service.js";

export type GetOrderInput = {
  orderId: string;
  participantId: string;
};

export type GetOrderOutput = OrderOutput;

export type GetOrderDeps = {
  orderFulfillmentService: OrderFulfillmentService;
  orderContext: OrderContext;
};

export class GetOrderUseCase {
  constructor(private readonly deps: GetOrderDeps) {}

  async execute(input: GetOrderInput): Promise<GetOrderOutput> {
    const order = await this.deps.orderFulfillmentService.getOrderForParticipant(
      {
        orderId: input.orderId,
        participantId: input.participantId,
      },
      this.deps.orderContext,
    );

    return toOrderOutput(order);
  }
}
