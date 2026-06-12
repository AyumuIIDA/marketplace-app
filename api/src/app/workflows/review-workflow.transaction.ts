import type { OrderContext } from "../../modules/orders/index.js";
import type { ReviewContext } from "../../modules/reviews/index.js";
import type { HumanSignatureTransactionContext } from "../../modules/signatures/index.js";

export type ReviewWorkflowTransactionContext = OrderContext &
  ReviewContext &
  HumanSignatureTransactionContext;

export interface ReviewWorkflowTransaction {
  run<T>(operation: (context: ReviewWorkflowTransactionContext) => Promise<T>): Promise<T>;
}
