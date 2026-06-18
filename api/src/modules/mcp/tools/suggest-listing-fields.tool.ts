import { z } from "zod";

import type { SuggestListingFieldsUseCase } from "../../ai-assistance/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const suggestListingFieldsToolInputSchema = z.object({
  userHint: z.string().trim().min(1).optional(),
  imageUrls: z.array(z.string().url()).min(1).max(10),
});

export type SuggestListingFieldsToolDeps = {
  suggestListingFieldsUseCase: SuggestListingFieldsUseCase;
};

export class SuggestListingFieldsTool implements McpTool {
  readonly name = "suggest_listing_fields";
  readonly inputSchema = suggestListingFieldsToolInputSchema.shape;

  constructor(private readonly deps: SuggestListingFieldsToolDeps) {}

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const parsed = suggestListingFieldsToolInputSchema.parse(input);
    const output = await this.deps.suggestListingFieldsUseCase.execute({
      userHint: parsed.userHint,
      imageUrls: parsed.imageUrls,
    });

    return toolSucceeded(output);
  }
}
