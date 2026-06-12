import type { Db } from "../../db/client.js";
import {
  DrizzleListingRepository,
  type ListingRepositoryDb,
} from "../../modules/listings/infrastructure/index.js";
import {
  DrizzleOrderRepository,
  type OrderRepositoryDb,
} from "../../modules/orders/infrastructure/index.js";

import type {
  PurchaseWorkflowTransaction,
  PurchaseWorkflowTransactionContext,
} from "./purchase-workflow.transaction.js";

export class DrizzlePurchaseWorkflowTransaction implements PurchaseWorkflowTransaction {
  constructor(private readonly db: Db) {}

  async run<T>(operation: (context: PurchaseWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) =>
      operation({
        listingRepository: new DrizzleListingRepository(tx as ListingRepositoryDb),
        orderRepository: new DrizzleOrderRepository(tx as OrderRepositoryDb),
      }),
    );
  }
}
