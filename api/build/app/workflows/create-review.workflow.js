import { AuthorizationError } from "../../shared/index.js";
export class CreateReviewWorkflow {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.deps.transaction.run(async (context) => {
            const order = await this.deps.orderFulfillmentService.getOrderForParticipant({
                orderId: input.orderId,
                participantId: input.reviewerId,
            }, context);
            const snapshot = order.snapshot;
            if (snapshot.status !== "RECEIVED" && snapshot.status !== "COMPLETED") {
                throw new AuthorizationError("Reviews can be created after the order is received.", {
                    orderId: input.orderId,
                    status: snapshot.status,
                });
            }
            const revieweeId = input.reviewerId === snapshot.buyerId ? snapshot.sellerId : snapshot.buyerId;
            return this.deps.createReviewUseCase.executeWithContext({
                orderId: input.orderId,
                reviewerId: input.reviewerId,
                revieweeId,
                agentId: input.agentId,
                rating: input.rating,
                comment: input.comment,
            }, context);
        });
    }
}
