import { OrderFulfillmentService } from "../../modules/orders/index.js";
import { ListMessagesUseCase, type MessageOutput } from "../../modules/messages/index.js";

import type { MessageWorkflowTransaction } from "./message-workflow.transaction.js";

export type ListOrderMessagesWorkflowInput = {
  orderId: string;
  participantId: string;
  status?: "SENT" | "HIDDEN";
  limit?: number;
};

export type ListOrderMessagesWorkflowOutput = {
  items: MessageOutput[];
};

export type ListOrderMessagesOperation = {
  execute(input: ListOrderMessagesWorkflowInput): Promise<ListOrderMessagesWorkflowOutput>;
};

export type ListOrderMessagesWorkflowDeps = {
  transaction: MessageWorkflowTransaction;
  orderFulfillmentService: OrderFulfillmentService;
  listMessagesUseCase: ListMessagesUseCase;
};

export class ListOrderMessagesWorkflow implements ListOrderMessagesOperation {
  constructor(private readonly deps: ListOrderMessagesWorkflowDeps) {}

  async execute(input: ListOrderMessagesWorkflowInput): Promise<ListOrderMessagesWorkflowOutput> {
    return this.deps.transaction.run(async (context) => {
      await this.deps.orderFulfillmentService.getOrderForParticipant(
        {
          orderId: input.orderId,
          participantId: input.participantId,
        },
        context,
      );

      return this.deps.listMessagesUseCase.execute({
        orderId: input.orderId,
        participantId: input.participantId,
        status: input.status,
        limit: input.limit,
      });
    });
  }
}
