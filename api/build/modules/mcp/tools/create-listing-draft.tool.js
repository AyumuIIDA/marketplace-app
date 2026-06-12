import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const createListingDraftToolInputSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    price: z.number().int().positive(),
    currency: z.literal("JPY").optional(),
    category: z.string().trim().min(1),
    condition: z.string().trim().min(1),
});
export class CreateListingDraftTool {
    deps;
    name = "create_listing_draft";
    inputSchema = createListingDraftToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
        const parsed = createListingDraftToolInputSchema.parse(input);
        const output = await this.deps.createListingUseCase.execute({
            sellerId: context.userId,
            agentId: context.agentId,
            ...parsed,
        });
        return toolSucceeded(output);
    }
}
