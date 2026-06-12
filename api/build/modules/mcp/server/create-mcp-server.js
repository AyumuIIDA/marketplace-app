import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMcpTool } from "./register-mcp-tool.js";
// リクエストごとに構築するMCPサーバ（stateless）。
// tool群はcomposition rootが組み立て、ここでcontextを束縛して登録する。
export function createMcpServer(tools, context) {
    const server = new McpServer({
        name: "human-backed-marketplace",
        version: "0.1.0",
    });
    for (const tool of tools) {
        registerMcpTool(server, tool, context);
    }
    return server;
}
