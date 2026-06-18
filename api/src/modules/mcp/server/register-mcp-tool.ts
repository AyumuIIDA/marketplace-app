import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { McpTool } from "../mcp-tool.js";
import type { McpToolRunner } from "../mcp-tool-runner.js";
import type { ToolContext } from "../tool-context.js";
import { toolFailed } from "../tool-result.js";

// 既存McpToolをSDKのregisterToolへ橋渡しするadapter。
// runner経由で実行し、全呼び出しをmcp_tool_callsへ監査記録する（要約/redactionはrunner責務）。
// ToolResultをMCPのCallToolResultへmapする。
// 機械可読値はstructuredContentへ置き、content textは人間/LLM向けの短い要約にする。
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
        content: [{ type: "text" as const, text: formatToolResultText(result) }],
        structuredContent: result,
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: formatToolResultText(result) }],
      structuredContent: result,
    };
  });
}

function formatToolResultText(result: Awaited<ReturnType<McpTool["execute"]>>): string {
  if (result.status === "FAILED") {
    return `${result.error.code}: ${result.error.message}`;
  }

  if (result.status === "REQUIRES_CONFIRMATION") {
    return "This tool requires user confirmation before it can continue.";
  }

  if (result.status === "REQUIRES_HUMAN_SIGNATURE") {
    return "This tool requires a human signature before it can continue.";
  }

  return "Tool call succeeded.";
}
