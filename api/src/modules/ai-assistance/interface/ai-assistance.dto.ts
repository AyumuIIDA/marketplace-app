import { z } from "zod";

export const suggestListingFieldsRequestSchema = z.object({
  userHint: z.string().trim().min(1).optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
});

export type SuggestListingFieldsRequest = z.infer<typeof suggestListingFieldsRequestSchema>;
