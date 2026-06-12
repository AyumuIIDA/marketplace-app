import { describe, expect, it } from "vitest";

import {
  AppError,
  DomainError,
  FixedClock,
  FixedIdGenerator,
  err,
  ok,
  type Result,
} from "../../../shared/index.js";
import {
  HumanSignature,
  type FindValidHumanSignatureInput,
  type HumanSignatureRepository,
  type WorldIdVerification,
  type WorldIdVerificationRepository,
} from "../domain/index.js";

import {
  CreateHumanSignatureUseCase,
  type CreateHumanSignatureInput,
} from "./create-human-signature.usecase.js";
import { HumanSignatureApplicationService } from "./human-signature.service.js";
import { HumanSignatureCreator } from "./human-signature.creator.js";
import type {
  HumanSignatureSigner,
  SignHumanSignatureInput,
  SignHumanSignatureOutput,
} from "./human-signature-signer.port.js";
import type {
  HumanSignatureTransaction,
  HumanSignatureTransactionContext,
} from "./human-signature.transaction.js";
import type {
  VerifyWorldIdProofInput,
  VerifyWorldIdProofOutput,
  WorldIdVerifier,
} from "./world-id-verifier.port.js";

describe("CreateHumanSignatureUseCase", () => {
  it("should verify an IDKit result, create a JWS signature, and return verification count", async () => {
    const fixedNow = new Date("2026-06-09T00:00:00.000Z");
    const verifiedAt = new Date("2026-06-09T00:00:01.000Z");
    const transaction = new FakeHumanSignatureTransaction();
    const worldIdVerifier = new FakeWorldIdVerifier({
      action: "LISTING_PUBLISH",
      nullifierHash: "nullifier-1",
      verificationLevel: "orb",
      signalHash: "signal-hash-1",
      environment: "production",
      verifiedAt,
    });
    const useCase = createUseCase({
      transaction,
      worldIdVerifier,
      fixedNow,
      ids: ["verification-1", "signature-1"],
    });

    const output = await useCase.execute(createInput({ expectedSignalHash: "signal-hash-1" }));

    expect(output).toEqual({
      signatureId: "signature-1",
      worldIdVerificationId: "verification-1",
      verificationCount: 1,
      signedAt: fixedNow,
    });
    expect(worldIdVerifier.inputs).toEqual([{ idKitResult: createIdKitResult() }]);
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(1);
    expect(transaction.worldIdVerificationRepository.verifications).toHaveLength(1);
    expect(transaction.runCount).toBe(1);
  });

  it("should allow multiple World ID verification records for the same user and action", async () => {
    const fixedNow = new Date("2026-06-09T00:00:00.000Z");
    const transaction = new FakeHumanSignatureTransaction();
    const useCase = createUseCase({
      transaction,
      worldIdVerifier: new FakeWorldIdVerifier({
        action: "LISTING_UPDATE",
        nullifierHash: "same-nullifier",
        verificationLevel: "orb",
        environment: "production",
        verifiedAt: fixedNow,
      }),
      fixedNow,
      ids: ["verification-1", "signature-1", "verification-2", "signature-2"],
    });

    const first = await useCase.execute(
      createInput({ actionType: "LISTING_UPDATE", resourceId: "listing-1", payloadHash: "sha256:payload-1" }),
    );
    const second = await useCase.execute(
      createInput({ actionType: "LISTING_UPDATE", resourceId: "listing-1", payloadHash: "sha256:payload-2" }),
    );

    expect(first.verificationCount).toBe(1);
    expect(second.verificationCount).toBe(2);
    expect(
      transaction.worldIdVerificationRepository.verifications.map(
        (verification) => verification.snapshot.nullifierHash,
      ),
    ).toEqual(["same-nullifier", "same-nullifier"]);
  });

  it("should reject duplicate valid signatures for the same resource payload", async () => {
    const fixedNow = new Date("2026-06-09T00:00:00.000Z");
    const transaction = new FakeHumanSignatureTransaction();
    transaction.humanSignatureRepository.signatures.push(
      HumanSignature.createValid({
        id: "existing-signature",
        userId: "user-1",
        actionType: "LISTING_PUBLISH",
        resourceType: "LISTING",
        resourceId: "listing-1",
        payloadHash: "sha256:payload-1",
        signatureValue: "jws-signature",
        worldIdVerificationId: "verification-1",
        signedAt: fixedNow,
      }),
    );
    const worldIdVerifier = new FakeWorldIdVerifier({
      action: "LISTING_PUBLISH",
      nullifierHash: "nullifier-1",
      verificationLevel: "orb",
      environment: "production",
      verifiedAt: fixedNow,
    });
    const useCase = createUseCase({
      transaction,
      worldIdVerifier,
      fixedNow,
      ids: ["verification-1", "signature-1"],
    });

    await expect(useCase.execute(createInput())).rejects.toThrow(DomainError);
    expect(worldIdVerifier.inputs).toHaveLength(1);
    expect(transaction.worldIdVerificationRepository.verifications).toHaveLength(0);
  });

  it("should not open a transaction when World ID verification fails", async () => {
    const fixedNow = new Date("2026-06-09T00:00:00.000Z");
    const transaction = new FakeHumanSignatureTransaction();
    const useCase = createUseCase({
      transaction,
      worldIdVerifier: new FakeWorldIdVerifier(
        undefined,
        new AppError("WORLD_ID_VERIFICATION_FAILED", "World ID verification failed.", 400),
      ),
      fixedNow,
      ids: ["verification-1", "signature-1"],
    });

    await expect(useCase.execute(createInput())).rejects.toThrow(AppError);
    expect(transaction.runCount).toBe(0);
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(0);
    expect(transaction.worldIdVerificationRepository.verifications).toHaveLength(0);
  });
});

function createUseCase(input: {
  transaction: FakeHumanSignatureTransaction;
  worldIdVerifier: WorldIdVerifier;
  fixedNow: Date;
  ids: string[];
}): CreateHumanSignatureUseCase {
  return new CreateHumanSignatureUseCase({
    humanSignatureTransaction: input.transaction,
    humanSignatureService: new HumanSignatureApplicationService({
      worldIdVerifier: input.worldIdVerifier,
      humanSignatureCreator: new HumanSignatureCreator({
        humanSignatureSigner: new FakeHumanSignatureSigner({
          signatureValue: "jws-signature",
          signedAt: input.fixedNow,
        }),
        idGenerator: new FixedIdGenerator(input.ids),
        clock: new FixedClock(input.fixedNow),
      }),
    }),
  });
}

function createInput(overrides: Partial<CreateHumanSignatureInput> = {}): CreateHumanSignatureInput {
  return {
    userId: "user-1",
    actionType: "LISTING_PUBLISH",
    resourceType: "LISTING",
    resourceId: "listing-1",
    payloadHash: "sha256:payload-1",
    idKitResult: createIdKitResult(),
    expectedEnvironment: "production",
    ...overrides,
  };
}

function createIdKitResult() {
  return {
    protocol_version: "3.0",
    nonce: "nonce-1",
    action: "LISTING_PUBLISH",
    environment: "production",
    responses: [
      {
        identifier: "orb",
        signal_hash: "signal-hash-1",
        proof: "proof-1",
        merkle_root: "merkle-root-1",
        nullifier: "nullifier-1",
      },
    ],
  };
}

class FakeHumanSignatureTransaction implements HumanSignatureTransaction {
  humanSignatureRepository = new FakeHumanSignatureRepository();
  worldIdVerificationRepository = new FakeWorldIdVerificationRepository();
  runCount = 0;

  async run<T>(operation: (context: HumanSignatureTransactionContext) => Promise<T>): Promise<T> {
    this.runCount += 1;
    return operation({
      humanSignatureRepository: this.humanSignatureRepository,
      worldIdVerificationRepository: this.worldIdVerificationRepository,
    });
  }
}

class FakeHumanSignatureRepository implements HumanSignatureRepository {
  signatures: HumanSignature[] = [];

  async save(signature: HumanSignature): Promise<void> {
    this.signatures.push(signature);
  }

  async findValidByResourcePayload(
    input: FindValidHumanSignatureInput,
  ): Promise<HumanSignature | undefined> {
    return this.signatures.find((signature) => {
      const snapshot = signature.snapshot;
      return (
        snapshot.status === "VALID" &&
        snapshot.actionType === input.actionType &&
        snapshot.resourceType === input.resourceType &&
        snapshot.resourceId === input.resourceId &&
        snapshot.payloadHash === input.payloadHash
      );
    });
  }
}

class FakeWorldIdVerificationRepository implements WorldIdVerificationRepository {
  verifications: WorldIdVerification[] = [];

  async save(verification: WorldIdVerification): Promise<void> {
    this.verifications.push(verification);
  }

  async countByUserAction(userId: string, action: string): Promise<number> {
    return this.verifications.filter((verification) => {
      const snapshot = verification.snapshot;
      return snapshot.userId === userId && snapshot.action === action;
    }).length;
  }
}

class FakeWorldIdVerifier implements WorldIdVerifier {
  inputs: VerifyWorldIdProofInput[] = [];

  constructor(
    private readonly output?: VerifyWorldIdProofOutput,
    private readonly error?: AppError,
  ) {}

  async verify(input: VerifyWorldIdProofInput): Promise<Result<VerifyWorldIdProofOutput, AppError>> {
    this.inputs.push(input);

    if (this.error !== undefined) {
      return err(this.error);
    }

    if (this.output === undefined) {
      return err(new AppError("WORLD_ID_VERIFICATION_NOT_CONFIGURED", "Fake verifier output is missing."));
    }

    return ok(this.output);
  }
}

class FakeHumanSignatureSigner implements HumanSignatureSigner {
  inputs: SignHumanSignatureInput[] = [];

  constructor(private readonly output: SignHumanSignatureOutput) {}

  async sign(input: SignHumanSignatureInput): Promise<Result<SignHumanSignatureOutput, AppError>> {
    this.inputs.push(input);
    return ok(this.output);
  }
}

