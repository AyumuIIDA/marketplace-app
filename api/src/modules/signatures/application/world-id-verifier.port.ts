import type { AppError, Result } from "../../../shared/index.js";

import type { IdKitResult } from "./idkit-result.type.js";

export type VerifyWorldIdProofInput = {
  idKitResult: IdKitResult;
};

export type VerifyWorldIdProofOutput = {
  action: string;
  nullifierHash: string;
  verificationLevel: string;
  signalHash?: string;
  environment: string;
  verifiedAt: Date;
};

export interface WorldIdVerifier {
  verify(input: VerifyWorldIdProofInput): Promise<Result<VerifyWorldIdProofOutput, AppError>>;
}
