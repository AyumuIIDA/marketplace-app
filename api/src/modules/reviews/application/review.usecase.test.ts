import { describe, expect, it } from "vitest";

import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { Review, type ReviewRepository, type SearchReviewsInput } from "../domain/index.js";

import { CreateReviewUseCase } from "./create-review.usecase.js";
import { ListReviewsUseCase } from "./list-reviews.usecase.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("Review use cases", () => {
  it("should create and list a submitted review", async () => {
    const reviewRepository = new FakeReviewRepository();
    const createUseCase = new CreateReviewUseCase({
      reviewRepository,
      idGenerator: new FixedIdGenerator(["review-1"]),
      clock: new FixedClock(fixedNow),
    });
    const listUseCase = new ListReviewsUseCase({ reviewRepository });

    const created = await createUseCase.execute({
      orderId: "order-1",
      reviewerId: "buyer-1",
      revieweeId: "seller-1",
      rating: 5,
      comment: "Great seller.",
    });
    const review = await reviewRepository.findById(created.reviewId);
    review?.submitWithSignature("signature-1", fixedNow);
    if (review !== undefined) {
      await reviewRepository.save(review);
    }
    const listed = await listUseCase.execute({
      revieweeId: "seller-1",
    });

    expect(created.status).toBe("DRAFT");
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.status).toBe("SUBMITTED");
  });
});

class FakeReviewRepository implements ReviewRepository {
  reviews = new Map<string, Review>();

  async save(review: Review): Promise<void> {
    this.reviews.set(review.id, review);
  }

  async findById(reviewId: string): Promise<Review | undefined> {
    return this.reviews.get(reviewId);
  }

  async findSubmittedByOrderReviewer(
    orderId: string,
    reviewerId: string,
  ): Promise<Review | undefined> {
    return [...this.reviews.values()].find((review) => {
      const snapshot = review.snapshot;
      return (
        snapshot.orderId === orderId &&
        snapshot.reviewerId === reviewerId &&
        snapshot.status === "SUBMITTED"
      );
    });
  }

  async search(input: SearchReviewsInput): Promise<Review[]> {
    return [...this.reviews.values()]
      .filter((review) => {
        const snapshot = review.snapshot;
        return (
          (input.revieweeId === undefined || snapshot.revieweeId === input.revieweeId) &&
          (input.status === undefined || snapshot.status === input.status)
        );
      })
      .slice(0, input.limit ?? 50);
  }
}
