import type { Clock } from "../../shared/index.js";
import { OrderFulfillmentService } from "../../modules/orders/index.js";
import {
  computeReviewPayloadHash,
  reviewToSignaturePayload,
  ReviewSubmissionService,
  type ReviewOutput,
} from "../../modules/reviews/index.js";
import type {
  HumanSignatureService,
  IdKitResult,
} from "../../modules/signatures/index.js";

import type { ReviewWorkflowTransaction } from "./review-workflow.transaction.js";

export type SubmitReviewWithHumanSignatureInput = {
  reviewId: string;
  reviewerId: string;
  idKitResult: IdKitResult;
  expectedEnvironment?: string;
};

export type SubmitReviewWithHumanSignatureOutput = {
  review: ReviewOutput;
  signatureId: string;
  worldIdVerificationId: string;
  verificationCount: number;
  orderCompleted: boolean;
};

export type SubmitReviewWithHumanSignatureOperation = {
  execute(
    input: SubmitReviewWithHumanSignatureInput,
  ): Promise<SubmitReviewWithHumanSignatureOutput>;
};

export type SubmitReviewWithHumanSignatureWorkflowDeps = {
  transaction: ReviewWorkflowTransaction;
  reviewSubmissionService: ReviewSubmissionService;
  humanSignatureService: HumanSignatureService;
  orderFulfillmentService: OrderFulfillmentService;
  clock: Clock;
};

export class SubmitReviewWithHumanSignatureWorkflow
  implements SubmitReviewWithHumanSignatureOperation
{
  constructor(private readonly deps: SubmitReviewWithHumanSignatureWorkflowDeps) {}

  async execute(
    input: SubmitReviewWithHumanSignatureInput,
  ): Promise<SubmitReviewWithHumanSignatureOutput> {
    // Phase 1: World ID検証はtransactionの外。外部HTTPがtransactionへ取り込まれない。
    const presence = await this.deps.humanSignatureService.verifyHumanPresence({
      idKitResult: input.idKitResult,
      expectedAction: "REVIEW_SUBMIT",
      expectedEnvironment: input.expectedEnvironment,
    });

    // Phase 2: DB読み取り・signal_hash束縛・署名永続化・状態変更のみtransaction境界内。
    return this.deps.transaction.run(async (context) => {
      const review = await this.deps.reviewSubmissionService.getReviewForSubmission(
        {
          reviewId: input.reviewId,
          reviewerId: input.reviewerId,
        },
        context,
      );
      const payloadHash = computeReviewPayloadHash(reviewToSignaturePayload(review));
      const signature = await this.deps.humanSignatureService.recordSignature(
        {
          userId: input.reviewerId,
          actionType: "REVIEW_SUBMIT",
          resourceType: "REVIEW",
          resourceId: input.reviewId,
          payloadHash,
          expectedSignalHash: payloadHash,
          presence,
        },
        context,
      );
      const submittedReview = await this.deps.reviewSubmissionService.submitWithSignature(
        {
          review,
          signatureId: signature.signatureId,
          signedAt: signature.signedAt,
        },
        context,
      );
      const order = await this.deps.orderFulfillmentService.getOrderForParticipant(
        {
          orderId: submittedReview.orderId,
          participantId: input.reviewerId,
        },
        context,
      );
      const submittedReviews = await context.reviewRepository.search({
        orderId: submittedReview.orderId,
        status: "SUBMITTED",
      });
      const reviewerIds = new Set(submittedReviews.map((item) => item.reviewerId));
      const orderSnapshot = order.snapshot;
      let orderCompleted = false;

      if (
        orderSnapshot.status === "RECEIVED" &&
        reviewerIds.has(orderSnapshot.buyerId) &&
        reviewerIds.has(orderSnapshot.sellerId)
      ) {
        order.completeAfterReviews(this.deps.clock.now());
        await context.orderRepository.save(order);
        orderCompleted = true;
      }

      return {
        review: submittedReview,
        signatureId: signature.signatureId,
        worldIdVerificationId: signature.worldIdVerificationId,
        verificationCount: signature.verificationCount,
        orderCompleted,
      };
    });
  }
}
