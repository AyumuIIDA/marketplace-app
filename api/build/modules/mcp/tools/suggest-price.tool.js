import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const suggestPriceToolInputSchema = z.object({
    title: z.string().trim().min(1),
    category: z.string().trim().min(1),
    condition: z.string().trim().min(1),
    priceStrategy: z.string().trim().min(1).optional(),
});
export class SuggestPriceTool {
    deps;
    name = "suggest_price";
    inputSchema = suggestPriceToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, _context) {
        const parsed = suggestPriceToolInputSchema.parse(input);
        const output = await this.deps.suggestPriceUseCase.execute({
            title: parsed.title,
            category: parsed.category,
            condition: parsed.condition,
            priceStrategy: parsed.priceStrategy,
        });
        return toolSucceeded(output);
    }
}
