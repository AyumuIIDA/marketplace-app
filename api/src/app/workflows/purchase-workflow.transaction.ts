import type { ListingPurchaseContext } from "../../modules/listings/index.js";
import type { OrderContext } from "../../modules/orders/index.js";

export type PurchaseWorkflowTransactionContext = ListingPurchaseContext & OrderContext;

export interface PurchaseWorkflowTransaction {
  run<T>(operation: (context: PurchaseWorkflowTransactionContext) => Promise<T>): Promise<T>;
}
