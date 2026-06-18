import { z } from "zod";

import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const presentDiscoverOutputToolInputSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(4000),
  listingIds: z.array(z.string().min(1)).max(24).optional(),
});

export class PresentDiscoverOutputTool implements McpTool {
  readonly name = "present_discover_output";
  readonly inputSchema = presentDiscoverOutputToolInputSchema.shape;

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const parsed = presentDiscoverOutputToolInputSchema.parse(input);

    return toolSucceeded({
      assistantMessage: parsed.assistantMessage,
      listingIds: parsed.listingIds ?? [],
    });
  }
}
