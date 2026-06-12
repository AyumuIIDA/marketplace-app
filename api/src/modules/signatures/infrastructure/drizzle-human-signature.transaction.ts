import type { Db } from "../../../db/client.js";
import type {
  HumanSignatureTransaction,
  HumanSignatureTransactionContext,
} from "../application/index.js";

import {
  DrizzleHumanSignatureRepository,
  DrizzleWorldIdVerificationRepository,
  type SignatureRepositoryDb,
} from "./drizzle-signature.repository.js";

export class DrizzleHumanSignatureTransaction implements HumanSignatureTransaction {
  constructor(private readonly db: Db) {}

  async run<T>(operation: (context: HumanSignatureTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) =>
      operation({
        humanSignatureRepository: new DrizzleHumanSignatureRepository(tx as SignatureRepositoryDb),
        worldIdVerificationRepository: new DrizzleWorldIdVerificationRepository(
          tx as SignatureRepositoryDb,
        ),
      }),
    );
  }
}

