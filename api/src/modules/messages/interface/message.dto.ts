import { z } from "zod";

import { messageStatusSchema } from "./message-status.dto.js";

export const sendMessageRequestSchema = z.object({
  body: z.string().min(1).max(5000),
  agentId: z.string().min(1).optional(),
});

export const listMessagesQuerySchema = z.object({
  status: messageStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
