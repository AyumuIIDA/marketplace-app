import { z } from "zod";

export const upsertCurrentUserRequestSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
});

export type UpsertCurrentUserRequest = z.infer<typeof upsertCurrentUserRequestSchema>;
