import { z } from "zod";

export const upsertCurrentUserRequestSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
});

export type UpsertCurrentUserRequest = z.infer<typeof upsertCurrentUserRequestSchema>;

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

export const linkWorldIdRequestSchema = z.object({
  idKitResult: idKitResultSchema,
  expectedEnvironment: z.string().optional(),
});

export type LinkWorldIdRequest = z.infer<typeof linkWorldIdRequestSchema>;
