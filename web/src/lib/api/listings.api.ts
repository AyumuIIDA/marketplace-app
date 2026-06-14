import { bffJson, isBffError } from "./bff-client";

export type Listing = {
  listingId: string;
  sellerId: string;
  agentId?: string;
  title: string;
  description: string;
  price: number;
  currency: "JPY";
  category: string;
  condition: string;
  status: "DRAFT" | "PUBLISHED" | "SOLD" | "HIDDEN";
  signatureId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  soldAt?: string;
};

export async function searchListings(input: { limit?: number } = {}): Promise<Listing[]> {
  const params = new URLSearchParams();

  if (input.limit !== undefined) {
    params.set("limit", input.limit.toString());
  }

  try {
    const output = await bffJson<{ items: Listing[] }>(
      `/listings${params.size > 0 ? `?${params.toString()}` : ""}`,
    );

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}
