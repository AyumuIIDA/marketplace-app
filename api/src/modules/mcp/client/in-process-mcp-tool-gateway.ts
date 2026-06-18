import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import type { McpTool } from "../mcp-tool.js";
import type { McpToolGateway, McpToolCallGatewayInput, McpToolCallGatewayOutput } from "../mcp-tool-gateway.js";
import type { McpToolRunner } from "../mcp-tool-runner.js";
import type { ToolContext } from "../tool-context.js";
import { createMcpServer } from "../server/index.js";

export type InProcessMcpToolGatewayDeps = {
  tools: McpTool[];
  runner: McpToolRunner;
  context: ToolContext;
};

export class InProcessMcpToolGateway implements McpToolGateway {
  constructor(private readonly deps: InProcessMcpToolGatewayDeps) {}

  async callTool(input: McpToolCallGatewayInput): Promise<McpToolCallGatewayOutput> {
    const server = createMcpServer(this.deps.tools, this.deps.context, this.deps.runner);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "discover-agent-runtime", version: "0.1.0" });

    await server.connect(serverTransport);

    try {
      await client.connect(clientTransport);
      const result = await client.callTool({
        name: input.name,
        arguments: input.arguments,
      });

      const contentText = Array.isArray(result.content)
        ? result.content
            .map((content) =>
              typeof content === "object" &&
              content !== null &&
              "type" in content &&
              content.type === "text" &&
              "text" in content &&
              typeof content.text === "string"
                ? content.text
                : "",
            )
            .join("\n")
        : "";

      return {
        structuredContent:
          typeof result.structuredContent === "object" && result.structuredContent !== null
            ? (result.structuredContent as Record<string, unknown>)
            : undefined,
        contentText,
      };
    } finally {
      await client.close();
      await server.close();
    }
  }
}
