import { z } from "zod";
import { agentStatusSchema } from "./agent-status.dto.js";
export const createAgentRequestSchema = z.object({
    name: z.string().trim().min(1).max(120),
});
export const listAgentsQuerySchema = z.object({
    status: agentStatusSchema.optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});
