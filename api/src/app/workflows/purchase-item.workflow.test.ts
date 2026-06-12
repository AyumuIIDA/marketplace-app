import { describe, expect, it } from "vitest";

import { AuthorizationError, FixedClock, FixedIdGenerator } from "../../shared/index.js";
import { ListingPurchaseService } from "../../modules/listings/application/index.js";
import {
  Listing,
  type ListingRepository,
  type SearchListingsInput,
} from "../../modules/listings/domain/index.js";
import { OrderFulfillmentService } from "../../modules/orders/application/index.js";
import {
  Order,
  type OrderRepository,
  type SearchOrdersInput,
} from "../../modules/orders/domain/index.js";

import {
  PurchaseItemWorkflow,
  type PurchaseWorkflowTransaction,
  type PurchaseWorkflowTransactionContext,
} from "./index.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("PurchaseItemWorkflow", () => {
  it("should require confirmation before purchasing", async () => {
    const transaction = new FakePurchaseWorkflowTransaction();
    const workflow = createWorkflow(transaction);

    const output = await workflow.execute({
      listingId: "listing-1",
      buyerId: "buyer-1",
      confirmed: false,
    });

    expect(output).toEqual({
      status: "REQUIRES_CONFIRMATION",
      listingId: "listing-1",
    });
    expect(transaction.runCount).toBe(0);
  });

  it("should create a paid order and mark the listing sold", async () => {
    const transaction = new FakePurchaseWorkflowTransaction();
    const listing = createPublishedListing();
    transaction.listingRepository.listings.set("listing-1", listing);
    const workflow = createWorkflow(transaction);

    const output = await workflow.execute({
      listingId: "listing-1",
      buyerId: "buyer-1",
      confirmed: true,
    });

    expect(output).toMatchObject({
      status: "PAID",
      order: {
        orderId: "order-1",
        status: "PAID",
      },
    });
    expect(transaction.listingRepository.listings.get("listing-1")?.status).toBe("SOLD");
    expect(transaction.orderRepository.orders.get("order-1")?.status).toBe("PAID");
    expect(transaction.runCount).toBe(1);
  });

  it("should reject a purchase when the listing was already claimed", async () => {
    const transaction = new FakePurchaseWorkflowTransaction();
    const listing = createPublishedListing();
    listing.markSold(fixedNow);
    transaction.listingRepository.listings.set("listing-1", listing);
    const workflow = createWorkflow(transaction);

    await expect(
      workflow.execute({
        listingId: "listing-1",
        buyerId: "buyer-1",
        confirmed: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(transaction.orderRepository.orders.size).toBe(0);
    expect(transaction.runCount).toBe(1);
  });
});

function createWorkflow(transaction: FakePurchaseWorkflowTransaction): PurchaseItemWorkflow {
  return new PurchaseItemWorkflow({
    transaction,
    listingPurchaseService: new ListingPurchaseService(),
    orderFulfillmentService: new OrderFulfillmentService({
      idGenerator: new FixedIdGenerator(["order-1"]),
      clock: new FixedClock(fixedNow),
    }),
    clock: new FixedClock(fixedNow),
  });
}

function createPublishedListing(): Listing {
  const listing = Listing.createDraft({
    id: "listing-1",
    sellerId: "seller-1",
    title: "Sneakers",
    description: "Used a few times.",
    price: 7800,
    category: "fashion_shoes",
    condition: "good",
    now: fixedNow,
  });
  listing.publish("signature-1", fixedNow);

  return listing;
}

class FakePurchaseWorkflowTransaction implements PurchaseWorkflowTransaction {
  listingRepository = new FakeListingRepository();
  orderRepository = new FakeOrderRepository();
  runCount = 0;

  async run<T>(operation: (context: PurchaseWorkflowTransactionContext) => Promise<T>): Promise<T> {
    this.runCount += 1;
    return operation({
      listingRepository: this.listingRepository,
      orderRepository: this.orderRepository,
    });
  }
}

class FakeListingRepository implements ListingRepository {
  listings = new Map<string, Listing>();

  async save(listing: Listing): Promise<void> {
    this.listings.set(listing.id, listing);
  }

  async findById(listingId: string): Promise<Listing | undefined> {
    return this.listings.get(listingId);
  }

  async claimForPurchase(input: {
    listingId: string;
    buyerId: string;
    soldAt: Date;
  }): Promise<Listing | undefined> {
    const listing = this.listings.get(input.listingId);

    if (listing === undefined) {
      return undefined;
    }

    const snapshot = listing.snapshot;

    if (snapshot.status !== "PUBLISHED" || snapshot.sellerId === input.buyerId) {
      return undefined;
    }

    listing.markSold(input.soldAt);
    this.listings.set(listing.id, listing);

    return listing;
  }

  async search(input: SearchListingsInput): Promise<Listing[]> {
    return [...this.listings.values()].slice(0, input.limit ?? 50);
  }
}

class FakeOrderRepository implements OrderRepository {
  orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(orderId: string): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }

  async findByListingId(listingId: string): Promise<Order | undefined> {
    return [...this.orders.values()].find((order) => order.snapshot.listingId === listingId);
  }

  async search(input: SearchOrdersInput): Promise<Order[]> {
    return [...this.orders.values()].slice(0, input.limit ?? 50);
  }
}
