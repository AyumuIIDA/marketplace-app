import { z } from "zod";
import { toolRequiresConfirmation, toolSucceeded } from "../tool-result.js";
const purchaseItemToolInputSchema = z.object({
    listingId: z.string().min(1),
    confirmed: z.boolean().optional().default(false),
});
export class PurchaseItemTool {
    deps;
    name = "purchase_item";
    inputSchema = purchaseItemToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
        const parsed = purchaseItemToolInputSchema.parse(input);
        const output = await this.deps.purchaseItemWorkflow.execute({
            listingId: parsed.listingId,
            buyerId: context.userId,
            confirmed: parsed.confirmed,
        });
        if (output.status === "REQUIRES_CONFIRMATION") {
            return toolRequiresConfirmation(output);
        }
        return toolSucceeded(output);
    }
}
