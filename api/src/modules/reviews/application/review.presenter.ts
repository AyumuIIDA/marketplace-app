import type { Review } from "../domain/index.js";
import type { ReviewStatus } from "../domain/index.js";

export type ReviewOutput = {
  reviewId: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  agentId?: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  signatureId?: string;
  createdAt: string;
  submittedAt?: string;
  hiddenAt?: string;
};

export function toReviewOutput(review: Review): ReviewOutput {
  const snapshot = review.snapshot;

  return {
    reviewId: snapshot.id,
    orderId: snapshot.orderId,
    reviewerId: snapshot.reviewerId,
    revieweeId: snapshot.revieweeId,
    agentId: snapshot.agentId,
    rating: snapshot.rating,
    comment: snapshot.comment,
    status: snapshot.status,
    signatureId: snapshot.signatureId,
    createdAt: snapshot.createdAt.toISOString(),
    submittedAt: snapshot.submittedAt?.toISOString(),
    hiddenAt: snapshot.hiddenAt?.toISOString(),
  };
}
