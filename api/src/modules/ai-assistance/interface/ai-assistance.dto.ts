import { z } from "zod";

export const suggestListingFieldsRequestSchema = z.object({
  userHint: z.string().trim().min(1).optional(),
  imageIds: z.array(z.string().trim().min(1)).optional(),
});

export type SuggestListingFieldsRequest = z.infer<typeof suggestListingFieldsRequestSchema>;
