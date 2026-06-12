import type { ReviewRepository, ReviewStatus } from "../domain/index.js";

import { toReviewOutput, type ReviewOutput } from "./review.presenter.js";

export type ListReviewsInput = {
  orderId?: string;
  revieweeId?: string;
  reviewerId?: string;
  status?: ReviewStatus;
  limit?: number;
};

export type ListReviewsOutput = {
  items: ReviewOutput[];
};

export type ListReviewsDeps = {
  reviewRepository: ReviewRepository;
};

export class ListReviewsUseCase {
  constructor(private readonly deps: ListReviewsDeps) {}

  async execute(input: ListReviewsInput): Promise<ListReviewsOutput> {
    const reviews = await this.deps.reviewRepository.search({
      orderId: input.orderId,
      revieweeId: input.revieweeId,
      reviewerId: input.reviewerId,
      status: input.status ?? "SUBMITTED",
      limit: input.limit,
    });

    return {
      items: reviews.map(toReviewOutput),
    };
  }
}
