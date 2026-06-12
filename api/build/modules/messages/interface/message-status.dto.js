import { z } from "zod";
export const messageStatusSchema = z.enum(["SENT", "HIDDEN"]);
