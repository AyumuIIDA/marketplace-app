import { describe, expect, it } from "vitest";

import { DomainError } from "../../../shared/index.js";

import { Review } from "./review.entity.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("Review", () => {
  it("should create a draft review", () => {
    const review = createDraftReview();

    expect(review.snapshot).toMatchObject({
      id: "review-1",
      orderId: "order-1",
      reviewerId: "buyer-1",
      revieweeId: "seller-1",
      rating: 5,
      status: "DRAFT",
    });
  });

  it("should reject an invalid rating", () => {
    expect(() =>
      Review.createDraft({
        id: "review-1",
        orderId: "order-1",
        reviewerId: "buyer-1",
        revieweeId: "seller-1",
        rating: 6,
        comment: "Great seller.",
        now: fixedNow,
      }),
    ).toThrow(DomainError);
  });

  it("should submit with a human signature", () => {
    const review = createDraftReview();

    review.submitWithSignature("signature-1", fixedNow);

    expect(review.snapshot).toMatchObject({
      status: "SUBMITTED",
      signatureId: "signature-1",
      submittedAt: fixedNow,
    });
  });
});

function createDraftReview(): Review {
  return Review.createDraft({
    id: "review-1",
    orderId: "order-1",
    reviewerId: "buyer-1",
    revieweeId: "seller-1",
    rating: 5,
    comment: "Great seller.",
    now: fixedNow,
  });
}
