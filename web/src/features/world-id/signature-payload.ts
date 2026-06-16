import type { Listing } from "../../lib/api/listings.api";
import type { Review } from "../../lib/api/reviews.api";

export async function computeListingSignal(listing: Listing): Promise<string> {
  return computePayloadHash({
    listingId: listing.listingId,
    sellerId: listing.sellerId,
    agentId: listing.agentId ?? null,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    category: listing.category,
    condition: listing.condition,
  });
}

export async function computeReviewSignal(review: Review): Promise<string> {
  return computePayloadHash({
    reviewId: review.reviewId,
    orderId: review.orderId,
    reviewerId: review.reviewerId,
    revieweeId: review.revieweeId,
    agentId: review.agentId ?? null,
    rating: review.rating,
    comment: review.comment,
  });
}

async function computePayloadHash(payload: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
}
