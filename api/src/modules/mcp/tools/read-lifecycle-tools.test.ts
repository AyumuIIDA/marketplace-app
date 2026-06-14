import { describe, expect, it } from "vitest";

import type { GetCurrentUserUseCase } from "../../identity/index.js";
import type { GetListingUseCase } from "../../listings/index.js";
import type {
  ListOrdersUseCase,
  MarkOrderReceivedUseCase,
  MarkOrderShippedUseCase,
} from "../../orders/index.js";
import type { ListOrderMessagesOperation } from "../../../app/workflows/index.js";

import { GetCurrentUserTool } from "./get-current-user.tool.js";
import { GetListingTool } from "./get-listing.tool.js";
import { ListOrdersTool } from "./list-orders.tool.js";
import { ListMessagesTool } from "./list-messages.tool.js";
import { MarkShippedTool } from "./mark-shipped.tool.js";
import { MarkReceivedTool } from "./mark-received.tool.js";

// 各toolが「主体(認可フィールド)を引数ではなくcontext.userIdから取る」ことを検証する。
// これによりエージェントが他人になりすまして読取/操作することを防ぐ。
function captor<TInput>() {
  let captured: TInput | undefined;
  const stub = {
    async execute(input: TInput): Promise<{ ok: true }> {
      captured = input;
      return { ok: true };
    },
  };

  return { stub, get: (): TInput | undefined => captured };
}

describe("MCP read/lifecycle tools", () => {
  it("get_current_user takes subject from context, not args", async () => {
    const c = captor<{ userId: string }>();
    const tool = new GetCurrentUserTool({
      getCurrentUserUseCase: c.stub as unknown as GetCurrentUserUseCase,
    });

    const result = await tool.execute({}, { userId: "user-1" });

    expect(result.status).toBe("SUCCEEDED");
    expect(c.get()).toEqual({ userId: "user-1" });
  });

  it("get_listing forwards requesterId from context", async () => {
    const c = captor<{ listingId: string; requesterId?: string }>();
    const tool = new GetListingTool({
      getListingUseCase: c.stub as unknown as GetListingUseCase,
    });

    await tool.execute({ listingId: "listing-1" }, { userId: "user-1" });

    expect(c.get()).toEqual({ listingId: "listing-1", requesterId: "user-1" });
  });

  it("list_orders scopes to participantId from context", async () => {
    const c = captor<{ participantId: string; status?: string; limit?: number }>();
    const tool = new ListOrdersTool({
      listOrdersUseCase: c.stub as unknown as ListOrdersUseCase,
    });

    await tool.execute({ status: "PAID", limit: 10 }, { userId: "user-1" });

    expect(c.get()).toEqual({ participantId: "user-1", status: "PAID", limit: 10 });
  });

  it("list_messages scopes to participantId from context", async () => {
    const c = captor<{ orderId: string; participantId: string }>();
    const tool = new ListMessagesTool({
      listOrderMessagesWorkflow: c.stub as unknown as ListOrderMessagesOperation,
    });

    await tool.execute({ orderId: "order-1" }, { userId: "user-1" });

    expect(c.get()).toMatchObject({ orderId: "order-1", participantId: "user-1" });
  });

  it("mark_shipped forwards sellerId from context", async () => {
    const c = captor<{ orderId: string; sellerId: string }>();
    const tool = new MarkShippedTool({
      markOrderShippedUseCase: c.stub as unknown as MarkOrderShippedUseCase,
    });

    await tool.execute({ orderId: "order-1" }, { userId: "seller-1" });

    expect(c.get()).toEqual({ orderId: "order-1", sellerId: "seller-1" });
  });

  it("mark_received forwards buyerId from context", async () => {
    const c = captor<{ orderId: string; buyerId: string }>();
    const tool = new MarkReceivedTool({
      markOrderReceivedUseCase: c.stub as unknown as MarkOrderReceivedUseCase,
    });

    await tool.execute({ orderId: "order-1" }, { userId: "buyer-1" });

    expect(c.get()).toEqual({ orderId: "order-1", buyerId: "buyer-1" });
  });
});
