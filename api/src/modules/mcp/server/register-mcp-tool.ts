import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolFailed } from "../tool-result.js";

// 既存McpToolをSDKのregisterToolへ橋渡しするadapter。
// ToolResultをMCPのCallToolResultへmapする（FAILEDのみisError、他はstructured payloadをtextで返す）。
export function registerMcpTool(server: McpServer, tool: McpTool, context: ToolContext): void {
  server.registerTool(tool.name, { inputSchema: tool.inputSchema ?? {} }, async (args) => {
    const result = await tool.execute(args, context).catch((error: unknown) => toolFailed(error));

    if (result.status === "FAILED") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  });
}
