import { describe, expect, it } from "vitest";

import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { McpToolCall, type McpToolCallRepository } from "../../agents/domain/index.js";
import { RecordMcpToolCallUseCase } from "../../agents/application/index.js";
import type { MessageOutput } from "../../messages/index.js";
import type { PublishListingWithHumanSignatureOutput } from "../../../app/workflows/index.js";
import { McpToolRunner } from "../mcp-tool-runner.js";

import { PublishListingTool } from "./publish-listing.tool.js";
import { PurchaseItemTool } from "./purchase-item.tool.js";
import { SendMessageTool } from "./send-message.tool.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("MCP proxy tools", () => {
  it("should require human signature before publishing without IDKit result", async () => {
    const tool = new PublishListingTool({
      publishListingWithHumanSignatureWorkflow: {
        async execute(): Promise<PublishListingWithHumanSignatureOutput> {
          throw new Error("Should not be called without IDKit result.");
        },
      },
    });

    const result = await tool.execute(
      {
        listingId: "listing-1",
      },
      {
        userId: "seller-1",
        agentId: "agent-1",
      },
    );

    expect(result).toEqual({
      status: "REQUIRES_HUMAN_SIGNATURE",
      data: {
        actionType: "LISTING_PUBLISH",
        resourceType: "LISTING",
        resourceId: "listing-1",
      },
    });
  });

  it("should convert purchase confirmation requirement", async () => {
    const tool = new PurchaseItemTool({
      purchaseItemWorkflow: {
        async execute(input): Promise<{ status: "REQUIRES_CONFIRMATION"; listingId: string }> {
          return {
            status: "REQUIRES_CONFIRMATION",
            listingId: input.listingId,
          };
        },
      },
    });

    const result = await tool.execute(
      {
        listingId: "listing-1",
      },
      {
        userId: "buyer-1",
      },
    );

    expect(result).toEqual({
      status: "REQUIRES_CONFIRMATION",
      data: {
        status: "REQUIRES_CONFIRMATION",
        listingId: "listing-1",
      },
    });
  });

  it("should run send_message and record redacted summaries", async () => {
    const repository = new FakeMcpToolCallRepository();
    const runner = new McpToolRunner({
      recordMcpToolCallUseCase: new RecordMcpToolCallUseCase({
        mcpToolCallRepository: repository,
        idGenerator: new FixedIdGenerator(["tool-call-1"]),
        clock: new FixedClock(fixedNow),
      }),
    });
    const tool = new SendMessageTool({
      sendOrderMessageWorkflow: {
        async execute(input): Promise<MessageOutput> {
          return {
            messageId: "message-1",
            orderId: input.orderId,
            senderId: input.senderId,
            recipientId: "seller-1",
            body: input.body,
            status: "SENT",
            createdAt: fixedNow.toISOString(),
          };
        },
      },
    });

    const result = await runner.run(
      tool,
      {
        orderId: "order-1",
        body: "Please ship tomorrow.",
      },
      {
        userId: "buyer-1",
        agentId: "agent-1",
      },
    );

    expect(result.status).toBe("SUCCEEDED");
    expect(repository.toolCalls[0]?.snapshot).toMatchObject({
      id: "tool-call-1",
      agentId: "agent-1",
      userId: "buyer-1",
      toolName: "send_message",
      inputSummary: {
        orderId: "order-1",
        bodyLength: 21,
      },
      outputSummary: {
        status: "SUCCEEDED",
      },
      status: "SUCCEEDED",
    });
  });
});

class FakeMcpToolCallRepository implements McpToolCallRepository {
  toolCalls: McpToolCall[] = [];

  async save(toolCall: McpToolCall): Promise<void> {
    this.toolCalls.push(toolCall);
  }
}
