import { z } from "zod";
import { reviewStatusEnumValues } from "./review-status.dto.js";
export const createReviewRequestSchema = z.object({
    orderId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(1),
    agentId: z.string().trim().min(1).optional(),
});
export const submitReviewRequestSchema = z.object({
    idKitResult: z
        .object({
        protocol_version: z.string().optional(),
        nonce: z.string().optional(),
        action: z.string().optional(),
        environment: z.string().optional(),
        responses: z
            .array(z
            .object({
            identifier: z.string().optional(),
            signal_hash: z.string().optional(),
            proof: z.string().optional(),
            merkle_root: z.string().optional(),
            nullifier: z.string().optional(),
        })
            .passthrough())
            .optional(),
    })
        .passthrough(),
    expectedEnvironment: z.string().optional(),
});
export const listReviewsQuerySchema = z.object({
    orderId: z.string().trim().min(1).optional(),
    revieweeId: z.string().trim().min(1).optional(),
    reviewerId: z.string().trim().min(1).optional(),
    status: z.enum(reviewStatusEnumValues).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});
