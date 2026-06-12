import { z } from "zod";

export const mcpIdKitProofResponseSchema = z
  .object({
    identifier: z.string().optional(),
    signal_hash: z.string().optional(),
    proof: z.string().optional(),
    merkle_root: z.string().optional(),
    nullifier: z.string().optional(),
  })
  .passthrough();

export const mcpIdKitResultSchema = z
  .object({
    protocol_version: z.string().optional(),
    nonce: z.string().optional(),
    action: z.string().optional(),
    environment: z.string().optional(),
    responses: z.array(mcpIdKitProofResponseSchema).optional(),
  })
  .passthrough();
