import type { Clock } from "../../shared/index.js";
import { ListingPurchaseService } from "../../modules/listings/index.js";
import { OrderFulfillmentService, type OrderOutput } from "../../modules/orders/index.js";

import type { PurchaseWorkflowTransaction } from "./purchase-workflow.transaction.js";

export type PurchaseItemInput = {
  listingId: string;
  buyerId: string;
  confirmed: boolean;
};

export type PurchaseItemOutput =
  | {
      status: "REQUIRES_CONFIRMATION";
      listingId: string;
    }
  | {
      status: "PAID";
      order: OrderOutput;
    };

export type PurchaseItemOperation = {
  execute(input: PurchaseItemInput): Promise<PurchaseItemOutput>;
};

export type PurchaseItemWorkflowDeps = {
  transaction: PurchaseWorkflowTransaction;
  listingPurchaseService: ListingPurchaseService;
  orderFulfillmentService: OrderFulfillmentService;
  clock: Clock;
};

export class PurchaseItemWorkflow implements PurchaseItemOperation {
  constructor(private readonly deps: PurchaseItemWorkflowDeps) {}

  async execute(input: PurchaseItemInput): Promise<PurchaseItemOutput> {
    if (!input.confirmed) {
      return {
        status: "REQUIRES_CONFIRMATION",
        listingId: input.listingId,
      };
    }

    return this.deps.transaction.run(async (context) => {
      const listing = await this.deps.listingPurchaseService.claimForPurchase(
        {
          listingId: input.listingId,
          buyerId: input.buyerId,
          soldAt: this.deps.clock.now(),
        },
        context,
      );
      const snapshot = listing.snapshot;
      const order = await this.deps.orderFulfillmentService.createPaidOrder(
        {
          listingId: snapshot.id,
          buyerId: input.buyerId,
          sellerId: snapshot.sellerId,
          price: snapshot.price,
          currency: snapshot.currency,
        },
        context,
      );

      return {
        status: "PAID",
        order,
      };
    });
  }
}
