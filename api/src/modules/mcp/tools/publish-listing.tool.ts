import { z } from "zod";

import type { PublishListingWithHumanSignatureOperation } from "../../../app/workflows/index.js";
import { mcpIdKitResultSchema } from "../idkit-result.schema.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolRequiresHumanSignature, toolSucceeded, type ToolResult } from "../tool-result.js";

const publishListingToolInputSchema = z.object({
  listingId: z.string().min(1),
  idKitResult: mcpIdKitResultSchema.optional(),
  expectedEnvironment: z.string().optional(),
});

export type PublishListingToolDeps = {
  publishListingWithHumanSignatureWorkflow: PublishListingWithHumanSignatureOperation;
};

export class PublishListingTool implements McpTool {
  readonly name = "publish_listing";
  readonly inputSchema = publishListingToolInputSchema.shape;

  constructor(private readonly deps: PublishListingToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = publishListingToolInputSchema.parse(input);

    if (parsed.idKitResult === undefined) {
      return toolRequiresHumanSignature({
        actionType: "LISTING_PUBLISH",
        resourceType: "LISTING",
        resourceId: parsed.listingId,
      });
    }

    const output = await this.deps.publishListingWithHumanSignatureWorkflow.execute({
      listingId: parsed.listingId,
      sellerId: context.userId,
      idKitResult: parsed.idKitResult,
      expectedEnvironment: parsed.expectedEnvironment,
    });

    return toolSucceeded(output);
  }
}
