import { OrderFulfillmentService } from "../../modules/orders/index.js";
import { SendMessageUseCase, type MessageOutput } from "../../modules/messages/index.js";

import type { MessageWorkflowTransaction } from "./message-workflow.transaction.js";

export type SendOrderMessageWorkflowInput = {
  orderId: string;
  senderId: string;
  body: string;
  agentId?: string;
};

export type SendOrderMessageOperation = {
  execute(input: SendOrderMessageWorkflowInput): Promise<MessageOutput>;
};

export type SendOrderMessageWorkflowDeps = {
  transaction: MessageWorkflowTransaction;
  orderFulfillmentService: OrderFulfillmentService;
  sendMessageUseCase: SendMessageUseCase;
};

export class SendOrderMessageWorkflow implements SendOrderMessageOperation {
  constructor(private readonly deps: SendOrderMessageWorkflowDeps) {}

  async execute(input: SendOrderMessageWorkflowInput): Promise<MessageOutput> {
    return this.deps.transaction.run(async (context) => {
      const order = await this.deps.orderFulfillmentService.getOrderForParticipant(
        {
          orderId: input.orderId,
          participantId: input.senderId,
        },
        context,
      );
      const snapshot = order.snapshot;
      const recipientId = input.senderId === snapshot.buyerId ? snapshot.sellerId : snapshot.buyerId;

      return this.deps.sendMessageUseCase.executeWithContext(
        {
          orderId: input.orderId,
          senderId: input.senderId,
          recipientId,
          agentId: input.agentId,
          body: input.body,
        },
        context,
      );
    });
  }
}
