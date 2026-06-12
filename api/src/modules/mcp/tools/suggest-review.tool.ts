import { z } from "zod";

import type { SuggestReviewUseCase } from "../../agents/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const suggestReviewToolInputSchema = z.object({
  orderId: z.string().min(1),
  ratingHint: z.number().int().min(1).max(5).optional(),
  tone: z.string().trim().min(1).optional(),
});

export type SuggestReviewToolDeps = {
  suggestReviewUseCase: SuggestReviewUseCase;
};

export class SuggestReviewTool implements McpTool {
  readonly name = "suggest_review";
  readonly inputSchema = suggestReviewToolInputSchema.shape;

  constructor(private readonly deps: SuggestReviewToolDeps) {}

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const parsed = suggestReviewToolInputSchema.parse(input);
    const output = await this.deps.suggestReviewUseCase.execute({
      orderId: parsed.orderId,
      ratingHint: parsed.ratingHint,
      tone: parsed.tone,
    });

    return toolSucceeded(output);
  }
}
