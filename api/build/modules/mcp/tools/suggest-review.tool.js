import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const suggestReviewToolInputSchema = z.object({
    orderId: z.string().min(1),
    ratingHint: z.number().int().min(1).max(5).optional(),
    tone: z.string().trim().min(1).optional(),
});
export class SuggestReviewTool {
    deps;
    name = "suggest_review";
    inputSchema = suggestReviewToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, _context) {
        const parsed = suggestReviewToolInputSchema.parse(input);
        const output = await this.deps.suggestReviewUseCase.execute({
            orderId: parsed.orderId,
            ratingHint: parsed.ratingHint,
            tone: parsed.tone,
        });
        return toolSucceeded(output);
    }
}
