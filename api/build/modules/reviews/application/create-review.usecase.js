import { AuthorizationError } from "../../../shared/index.js";
import { Review } from "../domain/index.js";
import { toReviewOutput } from "./review.presenter.js";
export class CreateReviewUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.executeWithContext(input, {
            reviewRepository: this.deps.reviewRepository,
        });
    }
    async executeWithContext(input, context) {
        const existing = await context.reviewRepository.findSubmittedByOrderReviewer(input.orderId, input.reviewerId);
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
