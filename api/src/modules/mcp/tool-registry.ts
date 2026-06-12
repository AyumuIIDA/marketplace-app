import type { McpTool } from "./mcp-tool.js";

export class ToolRegistry {
  private readonly tools = new Map<string, McpTool>();

  register(tool: McpTool): void {
    this.tools.set(tool.name, tool);
  }

  get(toolName: string): McpTool | undefined {
    return this.tools.get(toolName);
  }

  list(): McpTool[] {
    return [...this.tools.values()];
  }
}
