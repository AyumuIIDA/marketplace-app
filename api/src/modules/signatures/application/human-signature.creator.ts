import type { Clock, IdGenerator } from "../../../shared/index.js";
import { DomainError } from "../../../shared/index.js";
import {
  HumanSignature,
  WorldIdVerification,
  type SignatureAction,
  type SignatureResource,
} from "../domain/index.js";

import type { HumanSignatureSigner } from "./human-signature-signer.port.js";
import type { HumanSignatureTransactionContext } from "./human-signature.transaction.js";
import type { VerifyWorldIdProofOutput } from "./world-id-verifier.port.js";

export type CreateVerifiedHumanSignatureInput = {
  userId: string;
  actionType: SignatureAction;
  resourceType: SignatureResource;
  resourceId: string;
  payloadHash: string;
  verifiedWorldId: VerifyWorldIdProofOutput;
};

export type CreateVerifiedHumanSignatureOutput = {
  signatureId: string;
  worldIdVerificationId: string;
  verificationCount: number;
  signedAt: Date;
};

export type HumanSignatureCreatorDeps = {
  humanSignatureSigner: HumanSignatureSigner;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class HumanSignatureCreator {
  constructor(private readonly deps: HumanSignatureCreatorDeps) {}

  async create(
    input: CreateVerifiedHumanSignatureInput,
    context: HumanSignatureTransactionContext,
  ): Promise<CreateVerifiedHumanSignatureOutput> {
    const existingSignature = await context.humanSignatureRepository.findValidByResourcePayload({
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      payloadHash: input.payloadHash,
    });

    if (existingSignature !== undefined) {
      throw new DomainError("HUMAN_SIGNATURE_ALREADY_EXISTS", "A valid signature already exists.", {
        signatureId: existingSignature.id,
        actionType: input.actionType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        payloadHash: input.payloadHash,
      });
    }

    const now = this.deps.clock.now();
    const verification = WorldIdVerification.create({
      id: this.deps.idGenerator.newId(),
      userId: input.userId,
      action: input.verifiedWorldId.action,
      nullifierHash: input.verifiedWorldId.nullifierHash,
      verificationLevel: input.verifiedWorldId.verificationLevel,
      signalHash: input.verifiedWorldId.signalHash,
      environment: input.verifiedWorldId.environment,
      verifiedAt: input.verifiedWorldId.verifiedAt,
      now,
    });
    const signatureId = this.deps.idGenerator.newId();

    const signingResult = await this.deps.humanSignatureSigner.sign({
      signatureId,
      userId: input.userId,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      payloadHash: input.payloadHash,
      worldIdVerificationId: verification.id,
      issuedAt: now,
    });

    if (!signingResult.ok) {
      throw signingResult.error;
    }

    const signature = HumanSignature.createValid({
      id: signatureId,
      userId: input.userId,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      payloadHash: input.payloadHash,
      signatureValue: signingResult.value.signatureValue,
      worldIdVerificationId: verification.id,
      signedAt: signingResult.value.signedAt,
    });

    await context.worldIdVerificationRepository.save(verification);
    await context.humanSignatureRepository.save(signature);

    const verificationCount = await context.worldIdVerificationRepository.countByUserAction(
      input.userId,
      input.actionType,
    );

    return {
      signatureId: signature.id,
      worldIdVerificationId: verification.id,
      verificationCount,
      signedAt: signature.snapshot.signedAt,
    };
  }
}

