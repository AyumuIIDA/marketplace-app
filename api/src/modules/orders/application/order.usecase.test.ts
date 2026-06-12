import { describe, expect, it } from "vitest";

import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { Order, type OrderRepository, type SearchOrdersInput } from "../domain/index.js";

import { GetOrderUseCase } from "./get-order.usecase.js";
import { ListOrdersUseCase } from "./list-orders.usecase.js";
import { MarkOrderReceivedUseCase } from "./mark-order-received.usecase.js";
import { MarkOrderShippedUseCase } from "./mark-order-shipped.usecase.js";
import { OrderFulfillmentService } from "./order-fulfillment.service.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("Order use cases", () => {
  it("should create, get, list, ship, and receive an order", async () => {
    const orderRepository = new FakeOrderRepository();
    const service = new OrderFulfillmentService({
      idGenerator: new FixedIdGenerator(["order-1"]),
      clock: new FixedClock(fixedNow),
    });
    const context = { orderRepository };

    const created = await service.createPaidOrder(
      {
        listingId: "listing-1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        price: 7800,
      },
      context,
    );
    const got = await new GetOrderUseCase({
      orderFulfillmentService: service,
      orderContext: context,
    }).execute({
      orderId: "order-1",
      participantId: "buyer-1",
    });
    const listed = await new ListOrdersUseCase({ orderRepository }).execute({
      participantId: "seller-1",
    });
    const shipped = await new MarkOrderShippedUseCase({
      orderFulfillmentService: service,
      orderContext: context,
      clock: new FixedClock(fixedNow),
    }).execute({
      orderId: "order-1",
      sellerId: "seller-1",
    });
    const received = await new MarkOrderReceivedUseCase({
      orderFulfillmentService: service,
      orderContext: context,
      clock: new FixedClock(fixedNow),
    }).execute({
      orderId: "order-1",
      buyerId: "buyer-1",
    });

    expect(created.status).toBe("PAID");
    expect(got.orderId).toBe("order-1");
    expect(listed.items).toHaveLength(1);
    expect(shipped.status).toBe("SHIPPED");
    expect(received.status).toBe("RECEIVED");
  });
});

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
    return [...this.orders.values()]
      .filter((order) => {
        const snapshot = order.snapshot;
        return (
          (input.participantId === undefined ||
            snapshot.buyerId === input.participantId ||
            snapshot.sellerId === input.participantId) &&
          (input.status === undefined || snapshot.status === input.status)
        );
      })
      .slice(0, input.limit ?? 50);
  }
}
