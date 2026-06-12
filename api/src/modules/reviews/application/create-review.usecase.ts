import { AuthorizationError } from "../../../shared/index.js";
import type { Clock, IdGenerator } from "../../../shared/index.js";
import { Review, type ReviewRepository } from "../domain/index.js";

import { toReviewOutput, type ReviewOutput } from "./review.presenter.js";
import type { ReviewContext } from "./review-submission.service.js";

export type CreateReviewInput = {
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  agentId?: string;
  rating: number;
  comment: string;
};

export type CreateReviewOutput = ReviewOutput;

export type CreateReviewDeps = {
  reviewRepository: ReviewRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class CreateReviewUseCase {
  constructor(private readonly deps: CreateReviewDeps) {}

  async execute(input: CreateReviewInput): Promise<CreateReviewOutput> {
    return this.executeWithContext(input, {
      reviewRepository: this.deps.reviewRepository,
    });
  }

  async executeWithContext(
    input: CreateReviewInput,
    context: ReviewContext,
  ): Promise<CreateReviewOutput> {
    const existing = await context.reviewRepository.findSubmittedByOrderReviewer(
      input.orderId,
      input.reviewerId,
    );

    if (existing !== undefined) {
      throw new AuthorizationError("A submitted review already exists for this order reviewer.", {
        orderId: input.orderId,
        reviewerId: input.reviewerId,
      });
    }

    const review = Review.createDraft({
      id: this.deps.idGenerator.newId(),
      orderId: input.orderId,
      reviewerId: input.reviewerId,
      revieweeId: input.revieweeId,
      agentId: input.agentId,
      rating: input.rating,
      comment: input.comment,
      now: this.deps.clock.now(),
    });

    await context.reviewRepository.save(review);

    return toReviewOutput(review);
  }
}
