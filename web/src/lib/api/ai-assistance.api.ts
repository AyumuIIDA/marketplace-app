import { bffJson } from "./bff-client";

export type SuggestedListingFields = {
  title: string;
  description: string;
  category: string;
  condition: string;
  confidenceNotes: string[];
};

export async function suggestListingFields(input: {
  userHint?: string;
  imageUrls: string[];
}): Promise<SuggestedListingFields> {
  return bffJson<SuggestedListingFields>("/ai-assistance/listing-fields", {
    method: "POST",
    body: {
      userHint: input.userHint,
      imageUrls: input.imageUrls,
    },
  });
}
