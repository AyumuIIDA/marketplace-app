import type { SignatureAction, SignatureResource } from "../domain/index.js";

import type { HumanSignatureCreator } from "./human-signature.creator.js";
import type { HumanSignatureTransactionContext } from "./human-signature.transaction.js";
import type { IdKitResult } from "./idkit-result.type.js";
import type { VerifyWorldIdProofOutput, WorldIdVerifier } from "./world-id-verifier.port.js";
import {
  assertSignalHashBindsPayload,
  assertWorldIdMatchesAction,
} from "./world-id-verification.assertion.js";

// verifyHumanPresenceを通過した検証済みの実在人間証明(proof-carrying value)。
// brandはmodule内に閉じており、外部からはこの型を持つ値を構築できない。
// = この型の値を保持していること自体が「World ID Verify APIを通過した」証拠になる。
declare const verifiedHumanPresenceBrand: unique symbol;

export type VerifiedHumanPresence = VerifyWorldIdProofOutput & {
  readonly [verifiedHumanPresenceBrand]: true;
};

// VerifiedHumanPresenceの唯一の生成口。export しないことでmodule外からの構築を封じる。
function toVerifiedHumanPresence(value: VerifyWorldIdProofOutput): VerifiedHumanPresence {
  return value as VerifiedHumanPresence;
}

export type VerifyHumanPresenceInput = {
  idKitResult: IdKitResult;
  expectedAction: SignatureAction;
  expectedEnvironment?: string;
};

export type RecordSignatureInput = {
  userId: string;
  actionType: SignatureAction;
  resourceType: SignatureResource;
  resourceId: string;
  payloadHash: string;
  expectedSignalHash?: string;
  presence: VerifiedHumanPresence;
};

export type RecordSignatureOutput = {
  signatureId: string;
  worldIdVerificationId: string;
  verificationCount: number;
  signedAt: Date;
};

export interface HumanSignatureService {
  // Phase 1: 外部World ID検証。transaction contextを取らない = transactionの外で実行する。
  verifyHumanPresence(input: VerifyHumanPresenceInput): Promise<VerifiedHumanPresence>;

  // Phase 2: 署名作成と永続化。transaction contextを取る = transactionの中でのみ実行する。
  recordSignature(
    input: RecordSignatureInput,
    context: HumanSignatureTransactionContext,
  ): Promise<RecordSignatureOutput>;
}

export type HumanSignatureApplicationServiceDeps = {
  worldIdVerifier: WorldIdVerifier;
  humanSignatureCreator: HumanSignatureCreator;
};

export class HumanSignatureApplicationService implements HumanSignatureService {
  constructor(private readonly deps: HumanSignatureApplicationServiceDeps) {}

  async verifyHumanPresence(input: VerifyHumanPresenceInput): Promise<VerifiedHumanPresence> {
    const verificationResult = await this.deps.worldIdVerifier.verify({
      idKitResult: input.idKitResult,
    });

    if (!verificationResult.ok) {
      throw verificationResult.error;
    }

    assertWorldIdMatchesAction({
      verifiedWorldId: verificationResult.value,
      expectedAction: input.expectedAction,
      expectedEnvironment: input.expectedEnvironment,
    });

    return toVerifiedHumanPresence(verificationResult.value);
  }

  async recordSignature(
    input: RecordSignatureInput,
    context: HumanSignatureTransactionContext,
  ): Promise<RecordSignatureOutput> {
    assertSignalHashBindsPayload({
      actualSignalHash: input.presence.signalHash,
      expectedSignalHash: input.expectedSignalHash,
    });

    return this.deps.humanSignatureCreator.create(
      {
        userId: input.userId,
        actionType: input.actionType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        payloadHash: input.payloadHash,
        verifiedWorldId: input.presence,
      },
      context,
    );
  }
}
