import { toolFailed } from "../tool-result.js";
// 既存McpToolをSDKのregisterToolへ橋渡しするadapter。
// ToolResultをMCPのCallToolResultへmapする（FAILEDのみisError、他はstructured payloadをtextで返す）。
export function registerMcpTool(server, tool, context) {
    server.registerTool(tool.name, { inputSchema: tool.inputSchema ?? {} }, async (args) => {
        const result = await tool.execute(args, context).catch((error) => toolFailed(error));
        if (result.status === "FAILED") {
            return {
                content: [{ type: "text", text: JSON.stringify(result.error) }],
                isError: true,
            };
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
        };
    });
}
