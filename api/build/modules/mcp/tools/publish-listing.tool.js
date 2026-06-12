import { z } from "zod";
import { mcpIdKitResultSchema } from "../idkit-result.schema.js";
import { toolRequiresHumanSignature, toolSucceeded } from "../tool-result.js";
const publishListingToolInputSchema = z.object({
    listingId: z.string().min(1),
    idKitResult: mcpIdKitResultSchema.optional(),
    expectedEnvironment: z.string().optional(),
});
export class PublishListingTool {
    deps;
    name = "publish_listing";
    inputSchema = publishListingToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
        const parsed = publishListingToolInputSchema.parse(input);
        if (parsed.idKitResult === undefined) {
            return toolRequiresHumanSignature({
                actionType: "LISTING_PUBLISH",
                resourceType: "LISTING",
                resourceId: parsed.listingId,
            });
        }
        const output = await this.deps.publishListingWithHumanSignatureWorkflow.execute({
            listingId: parsed.listingId,
            sellerId: context.userId,
            idKitResult: parsed.idKitResult,
            expectedEnvironment: parsed.expectedEnvironment,
        });
        return toolSucceeded(output);
    }
}
