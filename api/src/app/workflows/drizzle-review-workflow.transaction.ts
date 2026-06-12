import type { Db } from "../../db/client.js";
import {
  DrizzleOrderRepository,
  type OrderRepositoryDb,
} from "../../modules/orders/infrastructure/index.js";
import {
  DrizzleReviewRepository,
  type ReviewRepositoryDb,
} from "../../modules/reviews/infrastructure/index.js";
import {
  DrizzleHumanSignatureRepository,
  DrizzleWorldIdVerificationRepository,
  type SignatureRepositoryDb,
} from "../../modules/signatures/infrastructure/index.js";

import type {
  ReviewWorkflowTransaction,
  ReviewWorkflowTransactionContext,
} from "./review-workflow.transaction.js";

export class DrizzleReviewWorkflowTransaction implements ReviewWorkflowTransaction {
  constructor(private readonly db: Db) {}

  async run<T>(operation: (context: ReviewWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) =>
      operation({
        orderRepository: new DrizzleOrderRepository(tx as OrderRepositoryDb),
        reviewRepository: new DrizzleReviewRepository(tx as ReviewRepositoryDb),
        humanSignatureRepository: new DrizzleHumanSignatureRepository(tx as SignatureRepositoryDb),
        worldIdVerificationRepository: new DrizzleWorldIdVerificationRepository(
          tx as SignatureRepositoryDb,
        ),
      }),
    );
  }
}
