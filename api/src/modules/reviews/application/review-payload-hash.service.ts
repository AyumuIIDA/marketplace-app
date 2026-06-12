import { createHash } from "node:crypto";

import type { Review } from "../domain/index.js";

export type ReviewSignaturePayload = {
  reviewId: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  agentId?: string;
  rating: number;
  comment: string;
};

export function computeReviewPayloadHash(payload: ReviewSignaturePayload): string {
  const canonicalPayload = JSON.stringify({
    reviewId: payload.reviewId,
    orderId: payload.orderId,
    reviewerId: payload.reviewerId,
    revieweeId: payload.revieweeId,
    agentId: payload.agentId ?? null,
    rating: payload.rating,
    comment: payload.comment,
  });

  return `sha256:${createHash("sha256").update(canonicalPayload, "utf8").digest("hex")}`;
}

export function reviewToSignaturePayload(review: Review): ReviewSignaturePayload {
  const snapshot = review.snapshot;

  return {
    reviewId: snapshot.id,
    orderId: snapshot.orderId,
    reviewerId: snapshot.reviewerId,
    revieweeId: snapshot.revieweeId,
    agentId: snapshot.agentId,
    rating: snapshot.rating,
    comment: snapshot.comment,
  };
}
