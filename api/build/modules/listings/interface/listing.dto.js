import { z } from "zod";
export const createListingRequestSchema = z.object({
    agentId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    price: z.number().int().positive(),
    currency: z.literal("JPY").optional(),
    category: z.string().trim().min(1),
    condition: z.string().trim().min(1),
});
export const listingSearchQuerySchema = z.object({
    keyword: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().int().positive().optional(),
    maxPrice: z.coerce.number().int().positive().optional(),
    condition: z.string().trim().min(1).optional(),
    mine: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});
export const idKitProofResponseSchema = z
    .object({
    identifier: z.string().optional(),
    signal_hash: z.string().optional(),
    proof: z.string().optional(),
    merkle_root: z.string().optional(),
    nullifier: z.string().optional(),
})
    .passthrough();
export const idKitResultSchema = z
    .object({
    protocol_version: z.string().optional(),
    nonce: z.string().optional(),
    action: z.string().optional(),
    environment: z.string().optional(),
    responses: z.array(idKitProofResponseSchema).optional(),
})
    .passthrough();
export const publishListingRequestSchema = z.object({
    idKitResult: idKitResultSchema,
    expectedEnvironment: z.string().optional(),
});
export const updateListingRequestSchema = z.object({
    fields: createListingRequestSchema.omit({ agentId: true }),
    idKitResult: idKitResultSchema,
    expectedEnvironment: z.string().optional(),
});
export const updateDraftListingRequestSchema = z.object({
    fields: createListingRequestSchema.omit({ agentId: true }),
});
export const purchaseListingRequestSchema = z.object({
    confirmed: z.boolean().optional().default(false),
});
