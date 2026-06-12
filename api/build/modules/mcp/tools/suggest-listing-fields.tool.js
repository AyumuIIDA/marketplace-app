import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const suggestListingFieldsToolInputSchema = z.object({
    userHint: z.string().trim().min(1).optional(),
    imageIds: z.array(z.string().min(1)).optional(),
});
export class SuggestListingFieldsTool {
    deps;
    name = "suggest_listing_fields";
    inputSchema = suggestListingFieldsToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, _context) {
        const parsed = suggestListingFieldsToolInputSchema.parse(input);
        const output = await this.deps.suggestListingFieldsUseCase.execute({
            userHint: parsed.userHint,
            imageIds: parsed.imageIds,
        });
        return toolSucceeded(output);
    }
}
