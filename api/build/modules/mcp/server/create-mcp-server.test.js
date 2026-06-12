import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SuggestPriceUseCase } from "../../agents/index.js";
import { DeterministicAiAssistant } from "../../agents/infrastructure/index.js";
import { SearchListingsTool, SuggestPriceTool } from "../tools/index.js";
import { createMcpServer } from "./create-mcp-server.js";
describe("createMcpServer", () => {
    it("registers tools and routes calls through the bridge to the use cases", async () => {
        const searchListingsUseCase = {
            execute: async () => ({
                listings: [{ id: "listing-1", title: "Wireless Earbuds" }],
            }),
        };
        const suggestPriceUseCase = new SuggestPriceUseCase({
            aiAssistant: new DeterministicAiAssistant(),
        });
        const server = createMcpServer([
            new SearchListingsTool({ searchListingsUseCase }),
            new SuggestPriceTool({ suggestPriceUseCase }),
        ], { userId: "user-1" });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        const client = new Client({ name: "test-client", version: "0.0.0" });
        await client.connect(clientTransport);
        const tools = await client.listTools();
        expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["search_listings", "suggest_price"]));
        const searchResult = await client.callTool({
            name: "search_listings",
            arguments: { keyword: "earbuds" },
        });
        expect(searchResult.content[0]?.text).toContain("listing-1");
        const priceResult = await client.callTool({
            name: "suggest_price",
            arguments: { title: "Earbuds", category: "electronics", condition: "good" },
        });
        expect(priceResult.content[0]?.text).toContain("15000");
        await client.close();
        await server.close();
    });
});
