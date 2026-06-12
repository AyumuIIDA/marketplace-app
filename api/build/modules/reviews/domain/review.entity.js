import { DomainError } from "../../../shared/index.js";
export class Review {
    props;
    constructor(props) {
        this.props = props;
    }
    static createDraft(input) {
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
    static rehydrate(props) {
        return new Review({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get reviewerId() {
        return this.props.reviewerId;
    }
    get status() {
        return this.props.status;
    }
    get snapshot() {
        return { ...this.props };
    }
    updateDraft(input) {
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
    submitWithSignature(signatureId, submittedAt) {
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
    hide(now) {
        this.props = {
            ...this.props,
            status: "HIDDEN",
            hiddenAt: now,
        };
    }
}
export function validateRating(rating) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new DomainError("REVIEW_RATING_INVALID", "Review rating must be an integer between 1 and 5.", {
            rating,
        });
    }
}
export function validateComment(comment) {
    if (comment.trim().length === 0) {
        throw new DomainError("REVIEW_COMMENT_REQUIRED", "Review comment is required.");
    }
}
