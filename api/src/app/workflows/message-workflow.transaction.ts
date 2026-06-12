import type { MessageContext } from "../../modules/messages/index.js";
import type { OrderContext } from "../../modules/orders/index.js";

export type MessageWorkflowTransactionContext = OrderContext & MessageContext;

export interface MessageWorkflowTransaction {
  run<T>(operation: (context: MessageWorkflowTransactionContext) => Promise<T>): Promise<T>;
}
