import { z } from "zod";

import type { SubmitReviewWithHumanSignatureOperation } from "../../../app/workflows/index.js";
import { mcpIdKitResultSchema } from "../idkit-result.schema.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolRequiresHumanSignature, toolSucceeded, type ToolResult } from "../tool-result.js";

const submitReviewToolInputSchema = z.object({
  reviewId: z.string().min(1),
  idKitResult: mcpIdKitResultSchema.optional(),
  expectedEnvironment: z.string().optional(),
});

export type SubmitReviewToolDeps = {
  submitReviewWithHumanSignatureWorkflow: SubmitReviewWithHumanSignatureOperation;
};

export class SubmitReviewTool implements McpTool {
  readonly name = "submit_review";
  readonly inputSchema = submitReviewToolInputSchema.shape;

  constructor(private readonly deps: SubmitReviewToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = submitReviewToolInputSchema.parse(input);

    if (parsed.idKitResult === undefined) {
      return toolRequiresHumanSignature({
        actionType: "REVIEW_SUBMIT",
        resourceType: "REVIEW",
        resourceId: parsed.reviewId,
      });
    }

    const output = await this.deps.submitReviewWithHumanSignatureWorkflow.execute({
      reviewId: parsed.reviewId,
      reviewerId: context.userId,
      idKitResult: parsed.idKitResult,
      expectedEnvironment: parsed.expectedEnvironment,
    });

    return toolSucceeded(output);
  }
}
