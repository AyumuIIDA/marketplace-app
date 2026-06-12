import type { Listing } from "../domain/index.js";
import type { ListingStatus } from "../domain/index.js";

export type ListingOutput = {
  listingId: string;
  sellerId: string;
  agentId?: string;
  title: string;
  description: string;
  price: number;
  currency: "JPY";
  category: string;
  condition: string;
  status: ListingStatus;
  signatureId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  soldAt?: string;
};

export function toListingOutput(listing: Listing): ListingOutput {
  const snapshot = listing.snapshot;

  return {
    listingId: snapshot.id,
    sellerId: snapshot.sellerId,
    agentId: snapshot.agentId,
    title: snapshot.title,
    description: snapshot.description,
    price: snapshot.price,
    currency: snapshot.currency,
    category: snapshot.category,
    condition: snapshot.condition,
    status: snapshot.status,
    signatureId: snapshot.signatureId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    publishedAt: snapshot.publishedAt?.toISOString(),
    soldAt: snapshot.soldAt?.toISOString(),
  };
}
