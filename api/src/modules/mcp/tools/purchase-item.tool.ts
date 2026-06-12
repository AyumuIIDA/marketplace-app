import { z } from "zod";

import type { McpTool } from "../mcp-tool.js";
import type { PurchaseItemOperation } from "../../../app/workflows/index.js";
import type { ToolContext } from "../tool-context.js";
import { toolRequiresConfirmation, toolSucceeded, type ToolResult } from "../tool-result.js";

const purchaseItemToolInputSchema = z.object({
  listingId: z.string().min(1),
  confirmed: z.boolean().optional().default(false),
});

export type PurchaseItemToolDeps = {
  purchaseItemWorkflow: PurchaseItemOperation;
};

export class PurchaseItemTool implements McpTool {
  readonly name = "purchase_item";
  readonly inputSchema = purchaseItemToolInputSchema.shape;

  constructor(private readonly deps: PurchaseItemToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = purchaseItemToolInputSchema.parse(input);
    const output = await this.deps.purchaseItemWorkflow.execute({
      listingId: parsed.listingId,
      buyerId: context.userId,
      confirmed: parsed.confirmed,
    });

    if (output.status === "REQUIRES_CONFIRMATION") {
      return toolRequiresConfirmation(output);
    }

    return toolSucceeded(output);
  }
}
