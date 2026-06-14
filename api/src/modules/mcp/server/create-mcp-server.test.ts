import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { RecordMcpToolCallUseCase, SuggestPriceUseCase } from "../../agents/index.js";
import { McpToolCall, type McpToolCallRepository } from "../../agents/domain/index.js";
import { DeterministicAiAssistant } from "../../agents/infrastructure/index.js";
import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { McpToolRunner } from "../mcp-tool-runner.js";
import type { GetCurrentUserUseCase } from "../../identity/index.js";
import type { GetListingUseCase, SearchListingsUseCase } from "../../listings/index.js";
import type {
  ListOrdersUseCase,
  MarkOrderReceivedUseCase,
  MarkOrderShippedUseCase,
} from "../../orders/index.js";
import type {
  CompareListingsOperation,
  ListOrderMessagesOperation,
} from "../../../app/workflows/index.js";
import type { SuggestMessageUseCase } from "../../agents/index.js";
import {
  CompareListingsTool,
  GetCurrentUserTool,
  GetListingTool,
  ListMessagesTool,
  ListOrdersTool,
  MarkReceivedTool,
  MarkShippedTool,
  SearchListingsTool,
  SuggestMessageTool,
  SuggestPriceTool,
} from "../tools/index.js";

import { createMcpServer } from "./create-mcp-server.js";

// .executeを持つだけの最小スタブ。registration/transport経路の疎通確認用。
const stubExecute = { execute: async () => ({ ok: true }) };

class FakeMcpToolCallRepository implements McpToolCallRepository {
  toolCalls: McpToolCall[] = [];

  async save(toolCall: McpToolCall): Promise<void> {
    this.toolCalls.push(toolCall);
  }
}

// 監査記録付きrunner。fake repoを使い記録された呼び出しを検証できるようにする。
function createRunner(): { runner: McpToolRunner; repo: FakeMcpToolCallRepository } {
  const repo = new FakeMcpToolCallRepository();
  const runner = new McpToolRunner({
    recordMcpToolCallUseCase: new RecordMcpToolCallUseCase({
      mcpToolCallRepository: repo,
      idGenerator: new FixedIdGenerator(["call-1", "call-2", "call-3"]),
      clock: new FixedClock(new Date("2026-06-12T00:00:00.000Z")),
    }),
  });

  return { runner, repo };
}

describe("createMcpServer", () => {
  it("registers tools and routes calls through the bridge to the use cases", async () => {
    const searchListingsUseCase = {
      execute: async () => ({
        listings: [{ id: "listing-1", title: "Wireless Earbuds" }],
      }),
    } as unknown as SearchListingsUseCase;
    const suggestPriceUseCase = new SuggestPriceUseCase({
      aiAssistant: new DeterministicAiAssistant(),
    });

    const server = createMcpServer(
      [
        new SearchListingsTool({ searchListingsUseCase }),
        new SuggestPriceTool({ suggestPriceUseCase }),
      ],
      { userId: "user-1" },
      createRunner().runner,
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["search_listings", "suggest_price"]),
    );

    const searchResult = await client.callTool({
      name: "search_listings",
      arguments: { keyword: "earbuds" },
    });
    expect((searchResult.content as Array<{ text: string }>)[0]?.text).toContain("listing-1");

    const priceResult = await client.callTool({
      name: "suggest_price",
      arguments: { title: "Earbuds", category: "electronics", condition: "good" },
    });
    expect((priceResult.content as Array<{ text: string }>)[0]?.text).toContain("15000");

    await client.close();
    await server.close();
  });

  it("advertises read/lifecycle tools and audits a call through the transport", async () => {
    const { runner, repo } = createRunner();
    const server = createMcpServer(
      [
        new GetCurrentUserTool({
          getCurrentUserUseCase: stubExecute as unknown as GetCurrentUserUseCase,
        }),
        new GetListingTool({
          getListingUseCase: {
            execute: async (input: { listingId: string }) => ({ id: input.listingId }),
          } as unknown as GetListingUseCase,
        }),
        new ListOrdersTool({ listOrdersUseCase: stubExecute as unknown as ListOrdersUseCase }),
        new ListMessagesTool({
          listOrderMessagesWorkflow: stubExecute as unknown as ListOrderMessagesOperation,
        }),
        new MarkShippedTool({
          markOrderShippedUseCase: stubExecute as unknown as MarkOrderShippedUseCase,
        }),
        new MarkReceivedTool({
          markOrderReceivedUseCase: stubExecute as unknown as MarkOrderReceivedUseCase,
        }),
        new SuggestMessageTool({
          suggestMessageUseCase: stubExecute as unknown as SuggestMessageUseCase,
        }),
        new CompareListingsTool({
          compareListingsWorkflow: stubExecute as unknown as CompareListingsOperation,
        }),
      ],
      { userId: "user-1", agentId: "agent-1" },
      runner,
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "get_current_user",
        "get_listing",
        "list_orders",
        "list_messages",
        "mark_shipped",
        "mark_received",
        "suggest_message",
        "compare_listings",
      ]),
    );

    const getListing = await client.callTool({
      name: "get_listing",
      arguments: { listingId: "listing-42" },
    });
    expect((getListing.content as Array<{ text: string }>)[0]?.text).toContain("listing-42");

    // #2 監査: tool呼び出しが mcp_tool_calls へ記録される。
    expect(repo.toolCalls).toHaveLength(1);
    expect(repo.toolCalls[0]?.snapshot).toMatchObject({
      agentId: "agent-1",
      userId: "user-1",
      toolName: "get_listing",
      inputSummary: { listingId: "listing-42" },
      outputSummary: { status: "SUCCEEDED" },
      status: "SUCCEEDED",
    });

    await client.close();
    await server.close();
  });
});
