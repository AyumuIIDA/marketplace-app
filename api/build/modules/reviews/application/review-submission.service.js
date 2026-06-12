import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { toReviewOutput } from "./review.presenter.js";
export class ReviewSubmissionService {
    async getReviewForSubmission(input, context) {
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
    async submitWithSignature(input, context) {
        input.review.submitWithSignature(input.signatureId, input.signedAt);
        await context.reviewRepository.save(input.review);
        return toReviewOutput(input.review);
    }
}
