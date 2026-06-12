import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const searchListingsToolInputSchema = z.object({
    keyword: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    minPrice: z.number().int().positive().optional(),
    maxPrice: z.number().int().positive().optional(),
    condition: z.string().trim().min(1).optional(),
    mine: z.boolean().optional(),
    limit: z.number().int().positive().max(100).optional(),
});
export class SearchListingsTool {
    deps;
    name = "search_listings";
    inputSchema = searchListingsToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
        const parsed = searchListingsToolInputSchema.parse(input);
        const output = await this.deps.searchListingsUseCase.execute({
            keyword: parsed.keyword,
            category: parsed.category,
            minPrice: parsed.minPrice,
            maxPrice: parsed.maxPrice,
            condition: parsed.condition,
            sellerId: parsed.mine === true ? context.userId : undefined,
            includeDraftsForSeller: parsed.mine === true,
            limit: parsed.limit,
        });
        return toolSucceeded(output);
    }
}
