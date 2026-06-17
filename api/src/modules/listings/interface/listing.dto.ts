import { z } from "zod";

import type { IdKitResult } from "../../signatures/index.js";

// 先行アップロード済み画像の参照。URL/hashは POST /listings/images の戻り値をそのまま渡す。
export const listingImageRefSchema = z.object({
  url: z.string().url(),
  hash: z.string().trim().min(1),
  sortOrder: z.number().int().min(0),
});

export const createListingRequestSchema = z.object({
  agentId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().int().positive(),
  currency: z.literal("JPY").optional(),
  category: z.string().trim().min(1),
  condition: z.string().trim().min(1),
  images: z.array(listingImageRefSchema).max(10).optional(),
});

export type CreateListingRequest = z.infer<typeof createListingRequestSchema>;

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

export type ListingSearchQuery = z.infer<typeof listingSearchQuerySchema>;

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

export type PublishListingRequest = z.infer<typeof publishListingRequestSchema> & {
  idKitResult: IdKitResult;
};

export const updateListingRequestSchema = z.object({
  fields: createListingRequestSchema.omit({ agentId: true, images: true }),
  idKitResult: idKitResultSchema,
  expectedEnvironment: z.string().optional(),
});

export type UpdateListingRequest = z.infer<typeof updateListingRequestSchema> & {
  idKitResult: IdKitResult;
};

export const updateDraftListingRequestSchema = z.object({
  fields: createListingRequestSchema.omit({ agentId: true, images: true }),
});

export type UpdateDraftListingRequest = z.infer<typeof updateDraftListingRequestSchema>;

export const purchaseListingRequestSchema = z.object({
  confirmed: z.boolean().optional().default(false),
});

export type PurchaseListingRequest = z.infer<typeof purchaseListingRequestSchema>;
