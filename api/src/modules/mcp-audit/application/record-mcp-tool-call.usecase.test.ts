import { describe, expect, it } from "vitest";

import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { McpToolCall, type McpToolCallRepository } from "../domain/index.js";

import { RecordMcpToolCallUseCase } from "./record-mcp-tool-call.usecase.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("RecordMcpToolCallUseCase", () => {
  it("should record MCP tool calls", async () => {
    const repository = new FakeMcpToolCallRepository();
    const useCase = new RecordMcpToolCallUseCase({
      mcpToolCallRepository: repository,
      idGenerator: new FixedIdGenerator(["tool-call-1"]),
      clock: new FixedClock(fixedNow),
    });

    const output = await useCase.execute({
      agentId: "agent-1",
      userId: "user-1",
      toolName: "purchase_item",
      inputSummary: {
        listingId: "listing-1",
      },
      outputSummary: {
        status: "REQUIRES_CONFIRMATION",
      },
      status: "REQUIRES_CONFIRMATION",
    });

    expect(output).toEqual({
      toolCallId: "tool-call-1",
    });
    expect(repository.toolCalls[0]?.snapshot).toMatchObject({
      id: "tool-call-1",
      agentId: "agent-1",
      userId: "user-1",
      toolName: "purchase_item",
      status: "REQUIRES_CONFIRMATION",
    });
  });
});

class FakeMcpToolCallRepository implements McpToolCallRepository {
  toolCalls: McpToolCall[] = [];

  async save(toolCall: McpToolCall): Promise<void> {
    this.toolCalls.push(toolCall);
  }
}
