import { z } from "zod";

import type { CompareListingsOperation } from "../../../app/workflows/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const compareListingsToolInputSchema = z.object({
  listingIds: z.array(z.string().min(1)).min(2).max(5),
});

export type CompareListingsToolDeps = {
  compareListingsWorkflow: CompareListingsOperation;
};

export class CompareListingsTool implements McpTool {
  readonly name = "compare_listings";
  readonly inputSchema = compareListingsToolInputSchema.shape;

  constructor(private readonly deps: CompareListingsToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = compareListingsToolInputSchema.parse(input);
    // requesterId=contextで取得時に閲覧権限をゲート（下書きは出品者のみ）。
    const output = await this.deps.compareListingsWorkflow.execute({
      listingIds: parsed.listingIds,
      requesterId: context.userId,
    });

    return toolSucceeded(output);
  }
}
