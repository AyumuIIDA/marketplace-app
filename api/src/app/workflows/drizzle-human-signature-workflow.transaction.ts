import type { Db } from "../../db/client.js";
import {
  DrizzleListingRepository,
  type ListingRepositoryDb,
} from "../../modules/listings/infrastructure/index.js";
import {
  DrizzleHumanSignatureRepository,
  DrizzleWorldIdVerificationRepository,
  type SignatureRepositoryDb,
} from "../../modules/signatures/infrastructure/index.js";

import type {
  HumanSignatureWorkflowTransaction,
  HumanSignatureWorkflowTransactionContext,
} from "./human-signature-workflow.transaction.js";

export class DrizzleHumanSignatureWorkflowTransaction implements HumanSignatureWorkflowTransaction {
  constructor(private readonly db: Db) {}

  async run<T>(
    operation: (context: HumanSignatureWorkflowTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction((tx) =>
      operation({
        listingRepository: new DrizzleListingRepository(tx as ListingRepositoryDb),
        humanSignatureRepository: new DrizzleHumanSignatureRepository(tx as SignatureRepositoryDb),
        worldIdVerificationRepository: new DrizzleWorldIdVerificationRepository(
          tx as SignatureRepositoryDb,
        ),
      }),
    );
  }
}
