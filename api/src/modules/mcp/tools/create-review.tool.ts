import { z } from "zod";

import type { McpTool } from "../mcp-tool.js";
import type { CreateReviewOperation } from "../../../app/workflows/index.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const createReviewToolInputSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1),
});

export type CreateReviewToolDeps = {
  createReviewWorkflow: CreateReviewOperation;
};

export class CreateReviewTool implements McpTool {
  readonly name = "create_review";
  readonly inputSchema = createReviewToolInputSchema.shape;

  constructor(private readonly deps: CreateReviewToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = createReviewToolInputSchema.parse(input);
    const output = await this.deps.createReviewWorkflow.execute({
      orderId: parsed.orderId,
      reviewerId: context.userId,
      rating: parsed.rating,
      comment: parsed.comment,
      agentId: context.agentId,
    });

    return toolSucceeded(output);
  }
}
