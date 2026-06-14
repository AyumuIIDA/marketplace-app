import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { McpTool } from "../mcp-tool.js";
import type { McpToolRunner } from "../mcp-tool-runner.js";
import type { ToolContext } from "../tool-context.js";
import { toolFailed } from "../tool-result.js";

// 既存McpToolをSDKのregisterToolへ橋渡しするadapter。
// runner経由で実行し、全呼び出しをmcp_tool_callsへ監査記録する（要約/redactionはrunner責務）。
// ToolResultをMCPのCallToolResultへmapする（FAILEDのみisError、他はstructured payloadをtextで返す）。
export function registerMcpTool(
  server: McpServer,
  tool: McpTool,
  context: ToolContext,
  runner: McpToolRunner,
): void {
  server.registerTool(tool.name, { inputSchema: tool.inputSchema ?? {} }, async (args) => {
    // runner.runはToolResultを必ず返す（execute例外も内部でtoolFailed化）。
    // 監査記録自体の失敗のみここでFAILEDへ落とし、transportを巻き込まない。
    const result = await runner.run(tool, args, context).catch((error: unknown) => toolFailed(error));

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
