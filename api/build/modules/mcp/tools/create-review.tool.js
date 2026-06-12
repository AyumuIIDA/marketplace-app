import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const createReviewToolInputSchema = z.object({
    orderId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(1),
});
export class CreateReviewTool {
    deps;
    name = "create_review";
    inputSchema = createReviewToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
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
