import { z } from "zod";

import type { SearchListingsUseCase } from "../../listings/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const searchListingsToolInputSchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  minPrice: z.number().int().positive().optional(),
  maxPrice: z.number().int().positive().optional(),
  condition: z.string().trim().min(1).optional(),
  mine: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type SearchListingsToolDeps = {
  searchListingsUseCase: SearchListingsUseCase;
};

export class SearchListingsTool implements McpTool {
  readonly name = "search_listings";
  readonly inputSchema = searchListingsToolInputSchema.shape;

  constructor(private readonly deps: SearchListingsToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = searchListingsToolInputSchema.parse(input);
    const output = await this.deps.searchListingsUseCase.execute({
      keyword: parsed.keyword,
      category: parsed.category,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      condition: parsed.condition,
      sellerId: parsed.mine === true ? context.userId : undefined,
      includeDraftsForSeller: parsed.mine === true,
      limit: parsed.limit,
    });

    return toolSucceeded(output);
  }
}
