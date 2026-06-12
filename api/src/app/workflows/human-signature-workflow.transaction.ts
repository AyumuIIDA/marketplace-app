import type { ListingPublicationContext } from "../../modules/listings/index.js";
import type { HumanSignatureTransactionContext } from "../../modules/signatures/index.js";

export type HumanSignatureWorkflowTransactionContext = ListingPublicationContext &
  HumanSignatureTransactionContext;

export interface HumanSignatureWorkflowTransaction {
  run<T>(operation: (context: HumanSignatureWorkflowTransactionContext) => Promise<T>): Promise<T>;
}
