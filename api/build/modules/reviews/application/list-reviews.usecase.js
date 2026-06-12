import { toReviewOutput } from "./review.presenter.js";
export class ListReviewsUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
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
