import type { McpToolCall } from "./mcp-tool-call.entity.js";

export interface McpToolCallRepository {
  save(toolCall: McpToolCall): Promise<void>;
}
