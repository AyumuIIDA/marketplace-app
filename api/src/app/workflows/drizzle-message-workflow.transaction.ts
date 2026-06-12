import type { Db } from "../../db/client.js";
import {
  DrizzleMessageRepository,
  type MessageRepositoryDb,
} from "../../modules/messages/infrastructure/index.js";
import {
  DrizzleOrderRepository,
  type OrderRepositoryDb,
} from "../../modules/orders/infrastructure/index.js";

import type {
  MessageWorkflowTransaction,
  MessageWorkflowTransactionContext,
} from "./message-workflow.transaction.js";

export class DrizzleMessageWorkflowTransaction implements MessageWorkflowTransaction {
  constructor(private readonly db: Db) {}

  async run<T>(operation: (context: MessageWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) =>
      operation({
        orderRepository: new DrizzleOrderRepository(tx as OrderRepositoryDb),
        messageRepository: new DrizzleMessageRepository(tx as MessageRepositoryDb),
      }),
    );
  }
}
