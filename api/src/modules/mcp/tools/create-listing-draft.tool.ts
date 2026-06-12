import { z } from "zod";

import type { CreateListingUseCase } from "../../listings/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const createListingDraftToolInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().int().positive(),
  currency: z.literal("JPY").optional(),
  category: z.string().trim().min(1),
  condition: z.string().trim().min(1),
});

export type CreateListingDraftToolDeps = {
  createListingUseCase: CreateListingUseCase;
};

export class CreateListingDraftTool implements McpTool {
  readonly name = "create_listing_draft";
  readonly inputSchema = createListingDraftToolInputSchema.shape;

  constructor(private readonly deps: CreateListingDraftToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = createListingDraftToolInputSchema.parse(input);
    const output = await this.deps.createListingUseCase.execute({
      sellerId: context.userId,
      agentId: context.agentId,
      ...parsed,
    });

    return toolSucceeded(output);
  }
}
