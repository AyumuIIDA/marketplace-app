import { z } from "zod";
export const agentStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
