import { describe, expect, it } from "vitest";

import {
  AppError,
  DomainError,
  FixedClock,
  FixedIdGenerator,
  err,
  ok,
  type Result,
} from "../../shared/index.js";
import {
  ListingPublicationService,
  computeListingPayloadHash,
  listingToSignaturePayload,
  type ListingFields,
} from "../../modules/listings/index.js";
import {
  Listing,
  type ListingRepository,
  type SearchListingsInput,
} from "../../modules/listings/domain/index.js";
import {
  HumanSignatureApplicationService,
  HumanSignatureCreator,
} from "../../modules/signatures/application/index.js";
import type {
  HumanSignatureSigner,
  SignHumanSignatureInput,
  SignHumanSignatureOutput,
} from "../../modules/signatures/application/human-signature-signer.port.js";
import type {
  VerifyWorldIdProofInput,
  VerifyWorldIdProofOutput,
  WorldIdVerifier,
} from "../../modules/signatures/application/world-id-verifier.port.js";
import {
  HumanSignature,
  type FindValidHumanSignatureInput,
  type HumanSignatureRepository,
  type WorldIdVerification,
  type WorldIdVerificationRepository,
} from "../../modules/signatures/domain/index.js";

import {
  PublishListingWithHumanSignatureWorkflow,
  UpdateListingWithHumanSignatureWorkflow,
  type HumanSignatureWorkflowTransaction,
  type HumanSignatureWorkflowTransactionContext,
} from "./index.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("PublishListingWithHumanSignatureWorkflow", () => {
  it("should create a human signature and publish a draft listing in one workflow transaction", async () => {
    const transaction = new FakeHumanSignatureWorkflowTransaction();
    const listing = createDraftListing();
    transaction.listingRepository.listings.set("listing-1", listing);
    const payloadHash = computeListingPayloadHash(listingToSignaturePayload(listing));
    const worldIdVerifier = new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_PUBLISH", payloadHash));
    const workflow = createPublishWorkflow(transaction, worldIdVerifier);

    const output = await workflow.execute({
      listingId: "listing-1",
      sellerId: "seller-1",
      idKitResult: createIdKitResult("LISTING_PUBLISH", payloadHash),
      expectedEnvironment: "production",
    });

    const published = transaction.listingRepository.listings.get("listing-1");
    expect(output.status).toBe("PUBLISHED");
    expect(output.signatureId).toBe("signature-1");
    expect(published?.status).toBe("PUBLISHED");
    expect(published?.snapshot.signatureId).toBe("signature-1");
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(1);
    expect(transaction.worldIdVerificationRepository.verifications).toHaveLength(1);
    expect(transaction.runCount).toBe(1);
  });

  it("should reject mismatched World ID actions before opening the workflow transaction", async () => {
    const transaction = new FakeHumanSignatureWorkflowTransaction();
    const listing = createDraftListing();
    transaction.listingRepository.listings.set("listing-1", listing);
    const payloadHash = computeListingPayloadHash(listingToSignaturePayload(listing));
    const workflow = createPublishWorkflow(
      transaction,
      new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_UPDATE", payloadHash)),
    );

    await expect(
      workflow.execute({
        listingId: "listing-1",
        sellerId: "seller-1",
        idKitResult: createIdKitResult("LISTING_UPDATE", payloadHash),
        expectedEnvironment: "production",
      }),
    ).rejects.toThrow(DomainError);
    // action不一致はWorld ID検証段階(transaction外)で弾かれるため、transactionは開かない。
    expect(transaction.runCount).toBe(0);
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(0);
  });

  it("should reject mismatched signal hashes computed from the listing payload", async () => {
    const transaction = new FakeHumanSignatureWorkflowTransaction();
    const listing = createDraftListing();
    transaction.listingRepository.listings.set("listing-1", listing);
    const workflow = createPublishWorkflow(
      transaction,
      new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_PUBLISH", "wrong-signal-hash")),
    );

    await expect(
      workflow.execute({
        listingId: "listing-1",
        sellerId: "seller-1",
        idKitResult: createIdKitResult("LISTING_PUBLISH", "wrong-signal-hash"),
        expectedEnvironment: "production",
      }),
    ).rejects.toThrow(DomainError);
    // signal_hash束縛は一貫したpayload_hashを必要とするため、transaction内(recordSignature)で検証される。
    expect(transaction.runCount).toBe(1);
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(0);
  });
});

describe("UpdateListingWithHumanSignatureWorkflow", () => {
  it("should create a human signature and update a published listing in one workflow transaction", async () => {
    const transaction = new FakeHumanSignatureWorkflowTransaction();
    const listing = createDraftListing();
    listing.publish("signature-initial", fixedNow);
    transaction.listingRepository.listings.set("listing-1", listing);
    const fields = createUpdateFields();
    const payloadHash = computeUpdatedListingPayloadHash(listing, fields);
    const worldIdVerifier = new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_UPDATE", payloadHash));
    const workflow = createUpdateWorkflow(transaction, worldIdVerifier);

    const output = await workflow.execute({
      listingId: "listing-1",
      sellerId: "seller-1",
      fields,
      idKitResult: createIdKitResult("LISTING_UPDATE", payloadHash),
      expectedEnvironment: "production",
    });

    const updated = transaction.listingRepository.listings.get("listing-1");
    expect(output.status).toBe("PUBLISHED");
    expect(output.signatureId).toBe("signature-1");
    expect(updated?.snapshot.title).toBe("Updated Sneakers");
    expect(updated?.snapshot.price).toBe(9000);
    expect(updated?.snapshot.signatureId).toBe("signature-1");
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(1);
    expect(transaction.worldIdVerificationRepository.verifications).toHaveLength(1);
    expect(transaction.runCount).toBe(1);
  });

  it("should not create a signature when World ID verification fails", async () => {
    const transaction = new FakeHumanSignatureWorkflowTransaction();
    const listing = createDraftListing();
    listing.publish("signature-initial", fixedNow);
    transaction.listingRepository.listings.set("listing-1", listing);
    const fields = createUpdateFields();
    const payloadHash = computeUpdatedListingPayloadHash(listing, fields);
    const workflow = createUpdateWorkflow(
      transaction,
      new FakeWorldIdVerifier(
        undefined,
        new AppError("WORLD_ID_VERIFICATION_FAILED", "World ID verification failed.", 400),
      ),
    );

    await expect(
      workflow.execute({
        listingId: "listing-1",
        sellerId: "seller-1",
        fields,
        idKitResult: createIdKitResult("LISTING_UPDATE", payloadHash),
      }),
    ).rejects.toThrow(AppError);
    // World ID検証失敗はtransaction外で起きるため、transactionは開かない。
    expect(transaction.runCount).toBe(0);
    expect(transaction.humanSignatureRepository.signatures).toHaveLength(0);
  });
});

function createPublishWorkflow(
  transaction: FakeHumanSignatureWorkflowTransaction,
  worldIdVerifier: WorldIdVerifier,
): PublishListingWithHumanSignatureWorkflow {
  return new PublishListingWithHumanSignatureWorkflow({
    transaction,
    listingPublicationService: new ListingPublicationService(),
    humanSignatureService: createHumanSignatureService(worldIdVerifier),
  });
}

function createUpdateWorkflow(
  transaction: FakeHumanSignatureWorkflowTransaction,
  worldIdVerifier: WorldIdVerifier,
): UpdateListingWithHumanSignatureWorkflow {
  return new UpdateListingWithHumanSignatureWorkflow({
    transaction,
    listingPublicationService: new ListingPublicationService(),
    humanSignatureService: createHumanSignatureService(worldIdVerifier),
  });
}

function createHumanSignatureService(worldIdVerifier: WorldIdVerifier): HumanSignatureApplicationService {
  return new HumanSignatureApplicationService({
    worldIdVerifier,
    humanSignatureCreator: new HumanSignatureCreator({
      humanSignatureSigner: new FakeHumanSignatureSigner({
        signatureValue: "jws-signature",
        signedAt: fixedNow,
      }),
      idGenerator: new FixedIdGenerator(["verification-1", "signature-1"]),
      clock: new FixedClock(fixedNow),
    }),
  });
}

function createDraftListing(): Listing {
  return Listing.createDraft({
    id: "listing-1",
    sellerId: "seller-1",
    title: "Sneakers",
    description: "Used a few times.",
    price: 7800,
    category: "fashion_shoes",
    condition: "good",
    now: fixedNow,
  });
}

function createUpdateFields(): ListingFields {
  return {
    title: "Updated Sneakers",
    description: "Updated description.",
    price: 9000,
    currency: "JPY",
    category: "fashion_shoes",
    condition: "very_good",
  };
}

function computeUpdatedListingPayloadHash(listing: Listing, fields: ListingFields): string {
  const current = listing.snapshot;

  return computeListingPayloadHash({
    listingId: current.id,
    sellerId: current.sellerId,
    agentId: current.agentId,
    ...fields,
  });
}

function createVerifiedWorldId(
  action: "LISTING_PUBLISH" | "LISTING_UPDATE",
  signalHash: string,
): VerifyWorldIdProofOutput {
  return {
    action,
    nullifierHash: "nullifier-1",
    verificationLevel: "orb",
    signalHash,
    environment: "production",
    verifiedAt: fixedNow,
  };
}

function createIdKitResult(action: "LISTING_PUBLISH" | "LISTING_UPDATE", signalHash: string) {
  return {
    protocol_version: "3.0",
    nonce: "nonce-1",
    action,
    environment: "production",
    responses: [
      {
        identifier: "orb",
        signal_hash: signalHash,
        proof: "proof-1",
        merkle_root: "merkle-root-1",
        nullifier: "nullifier-1",
      },
    ],
  };
}

class FakeHumanSignatureWorkflowTransaction implements HumanSignatureWorkflowTransaction {
  listingRepository = new FakeListingRepository();
  humanSignatureRepository = new FakeHumanSignatureRepository();
  worldIdVerificationRepository = new FakeWorldIdVerificationRepository();
  runCount = 0;

  async run<T>(operation: (context: HumanSignatureWorkflowTransactionContext) => Promise<T>): Promise<T> {
    this.runCount += 1;
    return operation({
      listingRepository: this.listingRepository,
      humanSignatureRepository: this.humanSignatureRepository,
      worldIdVerificationRepository: this.worldIdVerificationRepository,
    });
  }
}

class FakeListingRepository implements ListingRepository {
  listings = new Map<string, Listing>();

  async saveImages(_input: { listingId: string; images: { url: string; hash: string; sortOrder: number }[] }): Promise<void> {}

  async save(listing: Listing): Promise<void> {
    this.listings.set(listing.id, listing);
  }

  async findById(listingId: string): Promise<Listing | undefined> {
    return this.listings.get(listingId);
  }

  async claimForPurchase(input: {
    listingId: string;
    buyerId: string;
    soldAt: Date;
  }): Promise<Listing | undefined> {
    const listing = this.listings.get(input.listingId);

    if (listing === undefined) {
      return undefined;
    }

    const snapshot = listing.snapshot;

    if (snapshot.status !== "PUBLISHED" || snapshot.sellerId === input.buyerId) {
      return undefined;
    }

    listing.markSold(input.soldAt);
    this.listings.set(listing.id, listing);

    return listing;
  }

  async search(input: SearchListingsInput): Promise<Listing[]> {
    return [...this.listings.values()].slice(0, input.limit ?? 50);
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
