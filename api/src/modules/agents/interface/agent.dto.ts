import { z } from "zod";

import { agentStatusSchema } from "./agent-status.dto.js";

export const createAgentRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const listAgentsQuerySchema = z.object({
  status: agentStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const runDiscoverAgentRequestSchema = z.object({
  agentId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).max(2000),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .max(12)
    .optional(),
});
