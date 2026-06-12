import type { Review } from "./review.entity.js";
import type { ReviewStatus } from "./review-status.type.js";

export type SearchReviewsInput = {
  orderId?: string;
  reviewerId?: string;
  revieweeId?: string;
  status?: ReviewStatus;
  limit?: number;
};

export interface ReviewRepository {
  save(review: Review): Promise<void>;
  findById(reviewId: string): Promise<Review | undefined>;
  findSubmittedByOrderReviewer(orderId: string, reviewerId: string): Promise<Review | undefined>;
  search(input: SearchReviewsInput): Promise<Review[]>;
}
