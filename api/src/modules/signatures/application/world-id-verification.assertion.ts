import { DomainError } from "../../../shared/index.js";

import type { VerifyWorldIdProofOutput } from "./world-id-verifier.port.js";

export type AssertWorldIdMatchesActionInput = {
  verifiedWorldId: VerifyWorldIdProofOutput;
  expectedAction: string;
  expectedEnvironment?: string;
};

// Phase 1 (transactionの外): payload非依存の整合性確認。action/environmentはWorld ID検証だけで判定できる。
export function assertWorldIdMatchesAction(input: AssertWorldIdMatchesActionInput): void {
  if (input.verifiedWorldId.action !== input.expectedAction) {
    throw new DomainError("WORLD_ID_ACTION_MISMATCH", "World ID action does not match expected action.", {
      expectedAction: input.expectedAction,
      actualAction: input.verifiedWorldId.action,
    });
  }

  if (
    input.expectedEnvironment !== undefined &&
    input.verifiedWorldId.environment !== input.expectedEnvironment
  ) {
    throw new DomainError(
      "WORLD_ID_ENVIRONMENT_MISMATCH",
      "World ID environment does not match expected environment.",
      {
        expectedEnvironment: input.expectedEnvironment,
        actualEnvironment: input.verifiedWorldId.environment,
      },
    );
  }
}

export type AssertSignalHashBindsPayloadInput = {
  actualSignalHash?: string;
  expectedSignalHash?: string;
};

// Phase 2 (transactionの中): proofのsignal_hashが、永続化直前の一貫したpayload_hashへ束縛されているか確認する。
export function assertSignalHashBindsPayload(input: AssertSignalHashBindsPayloadInput): void {
  if (
    input.expectedSignalHash !== undefined &&
    input.actualSignalHash !== input.expectedSignalHash
  ) {
    throw new DomainError(
      "WORLD_ID_SIGNAL_HASH_MISMATCH",
      "World ID signal hash does not match expected payload signal.",
      {
        expectedSignalHash: input.expectedSignalHash,
        actualSignalHash: input.actualSignalHash,
      },
    );
  }
}
