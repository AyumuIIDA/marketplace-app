import { z } from "zod";
import { orderStatusEnumValues } from "./order-status.dto.js";
export const listOrdersQuerySchema = z.object({
    status: z.enum(orderStatusEnumValues).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});
