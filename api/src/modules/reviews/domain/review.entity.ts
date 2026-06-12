import { DomainError } from "../../../shared/index.js";

import type { ReviewStatus } from "./review-status.type.js";

export type ReviewProps = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  agentId?: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  signatureId?: string;
  createdAt: Date;
  submittedAt?: Date;
  hiddenAt?: Date;
};

export type CreateDraftReviewProps = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  agentId?: string;
  rating: number;
  comment: string;
  now: Date;
};

export class Review {
  private constructor(private props: ReviewProps) {}

  static createDraft(input: CreateDraftReviewProps): Review {
    if (input.reviewerId === input.revieweeId) {
      throw new DomainError("REVIEW_SELF_REVIEW_NOT_ALLOWED", "Reviewer and reviewee must be different.", {
        reviewerId: input.reviewerId,
      });
    }
    validateRating(input.rating);
    validateComment(input.comment);

    return new Review({
      id: input.id,
      orderId: input.orderId,
      reviewerId: input.reviewerId,
      revieweeId: input.revieweeId,
      agentId: input.agentId,
      rating: input.rating,
      comment: input.comment,
      status: "DRAFT",
      createdAt: input.now,
    });
  }

  static rehydrate(props: ReviewProps): Review {
    return new Review({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get reviewerId(): string {
    return this.props.reviewerId;
  }

  get status(): ReviewStatus {
    return this.props.status;
  }

  get snapshot(): ReviewProps {
    return { ...this.props };
  }

  updateDraft(input: { rating: number; comment: string }): void {
    if (this.props.status !== "DRAFT") {
      throw new DomainError("REVIEW_DRAFT_UPDATE_NOT_ALLOWED", "Only draft reviews can be updated.", {
        reviewId: this.props.id,
        status: this.props.status,
      });
    }
    validateRating(input.rating);
    validateComment(input.comment);

    this.props = {
      ...this.props,
      rating: input.rating,
      comment: input.comment,
    };
  }

  submitWithSignature(signatureId: string, submittedAt: Date): void {
    if (this.props.status !== "DRAFT") {
      throw new DomainError("REVIEW_NOT_SUBMITTABLE", "Only draft reviews can be submitted.", {
        reviewId: this.props.id,
        status: this.props.status,
      });
    }

    this.props = {
      ...this.props,
      status: "SUBMITTED",
      signatureId,
      submittedAt,
    };
  }

  hide(now: Date): void {
    this.props = {
      ...this.props,
      status: "HIDDEN",
      hiddenAt: now,
    };
  }
}

export function validateRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new DomainError("REVIEW_RATING_INVALID", "Review rating must be an integer between 1 and 5.", {
      rating,
    });
  }
}

export function validateComment(comment: string): void {
  if (comment.trim().length === 0) {
    throw new DomainError("REVIEW_COMMENT_REQUIRED", "Review comment is required.");
  }
}
