import { z } from "zod";
import { mcpIdKitResultSchema } from "../idkit-result.schema.js";
import { toolRequiresHumanSignature, toolSucceeded } from "../tool-result.js";
const listingFieldsSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    price: z.number().int().positive(),
    currency: z.literal("JPY").optional(),
    category: z.string().trim().min(1),
    condition: z.string().trim().min(1),
});
const updateListingToolInputSchema = z.object({
    listingId: z.string().min(1),
    fields: listingFieldsSchema,
    idKitResult: mcpIdKitResultSchema.optional(),
    expectedEnvironment: z.string().optional(),
});
export class UpdateListingTool {
    deps;
    name = "update_listing";
    inputSchema = updateListingToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
        const parsed = updateListingToolInputSchema.parse(input);
        if (parsed.idKitResult === undefined) {
            return toolRequiresHumanSignature({
                actionType: "LISTING_UPDATE",
                resourceType: "LISTING",
                resourceId: parsed.listingId,
            });
        }
        const output = await this.deps.updateListingWithHumanSignatureWorkflow.execute({
            listingId: parsed.listingId,
            sellerId: context.userId,
            fields: {
                ...parsed.fields,
                currency: parsed.fields.currency ?? "JPY",
            },
            idKitResult: parsed.idKitResult,
            expectedEnvironment: parsed.expectedEnvironment,
        });
        return toolSucceeded(output);
    }
}
