import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import type { Review, ReviewRepository } from "../domain/index.js";

import { toReviewOutput, type ReviewOutput } from "./review.presenter.js";

export type ReviewContext = {
  reviewRepository: ReviewRepository;
};

export type GetReviewForSubmissionInput = {
  reviewId: string;
  reviewerId: string;
};

export type SubmitReviewWithSignatureInput = {
  review: Review;
  signatureId: string;
  signedAt: Date;
};

export class ReviewSubmissionService {
  async getReviewForSubmission(
    input: GetReviewForSubmissionInput,
    context: ReviewContext,
  ): Promise<Review> {
    const review = await context.reviewRepository.findById(input.reviewId);

    if (review === undefined) {
      throw new NotFoundError("Review", input.reviewId);
    }

    if (review.reviewerId !== input.reviewerId) {
      throw new AuthorizationError("Only the reviewer can submit this review.", {
        reviewId: input.reviewId,
        reviewerId: input.reviewerId,
      });
    }

    return review;
  }

  async submitWithSignature(
    input: SubmitReviewWithSignatureInput,
    context: ReviewContext,
  ): Promise<ReviewOutput> {
    input.review.submitWithSignature(input.signatureId, input.signedAt);
    await context.reviewRepository.save(input.review);

    return toReviewOutput(input.review);
  }
}
