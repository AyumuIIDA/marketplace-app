import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { McpTool } from "../mcp-tool.js";
import type { McpToolRunner } from "../mcp-tool-runner.js";
import type { ToolContext } from "../tool-context.js";

import { registerMcpTool } from "./register-mcp-tool.js";

// リクエストごとに構築するMCPサーバ（stateless）。
// tool群はcomposition rootが組み立て、ここでcontextを束縛して登録する。
// runnerは全tool呼び出しを監査記録する（registerMcpToolが経由）。
export function createMcpServer(
  tools: McpTool[],
  context: ToolContext,
  runner: McpToolRunner,
): McpServer {
  const server = new McpServer({
    name: "human-backed-marketplace",
    version: "0.1.0",
  });

  for (const tool of tools) {
    registerMcpTool(server, tool, context, runner);
  }

  return server;
}
