import { z } from "zod";

import { NotFoundError, parseUuid } from "../../../shared/index.js";
import type { GetListingUseCase } from "../../listings/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const getListingToolInputSchema = z.object({
  listingId: z.string().min(1),
});

export type GetListingToolDeps = {
  getListingUseCase: GetListingUseCase;
};

export class GetListingTool implements McpTool {
  readonly name = "get_listing";
  readonly inputSchema = getListingToolInputSchema.shape;

  constructor(private readonly deps: GetListingToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = getListingToolInputSchema.parse(input);
    const listingId = parseUuid(parsed.listingId);

    if (listingId === undefined) {
      throw new NotFoundError("Listing", parsed.listingId);
    }

    // requesterIdを渡すことで、下書きは出品者本人のみ取得可（usecase側でゲート）。
    const output = await this.deps.getListingUseCase.execute({
      listingId,
      requesterId: context.userId,
    });

    return toolSucceeded(output);
  }
}
