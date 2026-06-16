import { z } from "zod";

import type { SuggestPriceUseCase } from "../../ai-assistance/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const suggestPriceToolInputSchema = z.object({
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  condition: z.string().trim().min(1),
  priceStrategy: z.string().trim().min(1).optional(),
});

export type SuggestPriceToolDeps = {
  suggestPriceUseCase: SuggestPriceUseCase;
};

export class SuggestPriceTool implements McpTool {
  readonly name = "suggest_price";
  readonly inputSchema = suggestPriceToolInputSchema.shape;

  constructor(private readonly deps: SuggestPriceToolDeps) {}

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const parsed = suggestPriceToolInputSchema.parse(input);
    const output = await this.deps.suggestPriceUseCase.execute({
      title: parsed.title,
      category: parsed.category,
      condition: parsed.condition,
      priceStrategy: parsed.priceStrategy,
    });

    return toolSucceeded(output);
  }
}
