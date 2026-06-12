import { AuthorizationError } from "../../shared/index.js";
import { OrderFulfillmentService } from "../../modules/orders/index.js";
import { CreateReviewUseCase, type ReviewOutput } from "../../modules/reviews/index.js";

import type { ReviewWorkflowTransaction } from "./review-workflow.transaction.js";

export type CreateReviewWorkflowInput = {
  orderId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  agentId?: string;
};

export type CreateReviewOperation = {
  execute(input: CreateReviewWorkflowInput): Promise<ReviewOutput>;
};

export type CreateReviewWorkflowDeps = {
  transaction: ReviewWorkflowTransaction;
  orderFulfillmentService: OrderFulfillmentService;
  createReviewUseCase: CreateReviewUseCase;
};

export class CreateReviewWorkflow implements CreateReviewOperation {
  constructor(private readonly deps: CreateReviewWorkflowDeps) {}

  async execute(input: CreateReviewWorkflowInput): Promise<ReviewOutput> {
    return this.deps.transaction.run(async (context) => {
      const order = await this.deps.orderFulfillmentService.getOrderForParticipant(
        {
          orderId: input.orderId,
          participantId: input.reviewerId,
        },
        context,
      );
      const snapshot = order.snapshot;

      if (snapshot.status !== "RECEIVED" && snapshot.status !== "COMPLETED") {
        throw new AuthorizationError("Reviews can be created after the order is received.", {
          orderId: input.orderId,
          status: snapshot.status,
        });
      }

      const revieweeId = input.reviewerId === snapshot.buyerId ? snapshot.sellerId : snapshot.buyerId;

      return this.deps.createReviewUseCase.executeWithContext(
        {
          orderId: input.orderId,
          reviewerId: input.reviewerId,
          revieweeId,
          agentId: input.agentId,
          rating: input.rating,
          comment: input.comment,
        },
        context,
      );
    });
  }
}
