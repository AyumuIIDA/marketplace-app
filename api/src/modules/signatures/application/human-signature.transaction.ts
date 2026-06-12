import type {
  HumanSignatureRepository,
  WorldIdVerificationRepository,
} from "../domain/index.js";

export type HumanSignatureTransactionContext = {
  humanSignatureRepository: HumanSignatureRepository;
  worldIdVerificationRepository: WorldIdVerificationRepository;
};

export interface HumanSignatureTransaction {
  run<T>(operation: (context: HumanSignatureTransactionContext) => Promise<T>): Promise<T>;
}

