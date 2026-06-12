import { z } from "zod";
import { mcpIdKitResultSchema } from "../idkit-result.schema.js";
import { toolRequiresHumanSignature, toolSucceeded } from "../tool-result.js";
const submitReviewToolInputSchema = z.object({
    reviewId: z.string().min(1),
    idKitResult: mcpIdKitResultSchema.optional(),
    expectedEnvironment: z.string().optional(),
});
export class SubmitReviewTool {
    deps;
    name = "submit_review";
    inputSchema = submitReviewToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
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
