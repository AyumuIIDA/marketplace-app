import { describe, expect, it } from "vitest";
import { AppError, DomainError, FixedClock, FixedIdGenerator, err, ok, } from "../../shared/index.js";
import { ListingPublicationService, computeListingPayloadHash, listingToSignaturePayload, } from "../../modules/listings/index.js";
import { Listing, } from "../../modules/listings/domain/index.js";
import { HumanSignatureApplicationService, HumanSignatureCreator, } from "../../modules/signatures/application/index.js";
import { PublishListingWithHumanSignatureWorkflow, UpdateListingWithHumanSignatureWorkflow, } from "./index.js";
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
        const workflow = createPublishWorkflow(transaction, new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_UPDATE", payloadHash)));
        await expect(workflow.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            idKitResult: createIdKitResult("LISTING_UPDATE", payloadHash),
            expectedEnvironment: "production",
        })).rejects.toThrow(DomainError);
        // action不一致はWorld ID検証段階(transaction外)で弾かれるため、transactionは開かない。
        expect(transaction.runCount).toBe(0);
        expect(transaction.humanSignatureRepository.signatures).toHaveLength(0);
    });
    it("should reject mismatched signal hashes computed from the listing payload", async () => {
        const transaction = new FakeHumanSignatureWorkflowTransaction();
        const listing = createDraftListing();
        transaction.listingRepository.listings.set("listing-1", listing);
        const workflow = createPublishWorkflow(transaction, new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_PUBLISH", "wrong-signal-hash")));
        await expect(workflow.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            idKitResult: createIdKitResult("LISTING_PUBLISH", "wrong-signal-hash"),
            expectedEnvironment: "production",
        })).rejects.toThrow(DomainError);
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
        const workflow = createUpdateWorkflow(transaction, new FakeWorldIdVerifier(undefined, new AppError("WORLD_ID_VERIFICATION_FAILED", "World ID verification failed.", 400)));
        await expect(workflow.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            fields,
            idKitResult: createIdKitResult("LISTING_UPDATE", payloadHash),
        })).rejects.toThrow(AppError);
        // World ID検証失敗はtransaction外で起きるため、transactionは開かない。
        expect(transaction.runCount).toBe(0);
        expect(transaction.humanSignatureRepository.signatures).toHaveLength(0);
    });
});
function createPublishWorkflow(transaction, worldIdVerifier) {
    return new PublishListingWithHumanSignatureWorkflow({
        transaction,
        listingPublicationService: new ListingPublicationService(),
        humanSignatureService: createHumanSignatureService(worldIdVerifier),
    });
}
function createUpdateWorkflow(transaction, worldIdVerifier) {
    return new UpdateListingWithHumanSignatureWorkflow({
        transaction,
        listingPublicationService: new ListingPublicationService(),
        humanSignatureService: createHumanSignatureService(worldIdVerifier),
    });
}
function createHumanSignatureService(worldIdVerifier) {
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
function createDraftListing() {
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
function createUpdateFields() {
    return {
        title: "Updated Sneakers",
        description: "Updated description.",
        price: 9000,
        currency: "JPY",
        category: "fashion_shoes",
        condition: "very_good",
    };
}
function computeUpdatedListingPayloadHash(listing, fields) {
    const current = listing.snapshot;
    return computeListingPayloadHash({
        listingId: current.id,
        sellerId: current.sellerId,
        agentId: current.agentId,
        ...fields,
    });
}
function createVerifiedWorldId(action, signalHash) {
    return {
        action,
        nullifierHash: "nullifier-1",
        verificationLevel: "orb",
        signalHash,
        environment: "production",
        verifiedAt: fixedNow,
    };
}
function createIdKitResult(action, signalHash) {
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
class FakeHumanSignatureWorkflowTransaction {
    listingRepository = new FakeListingRepository();
    humanSignatureRepository = new FakeHumanSignatureRepository();
    worldIdVerificationRepository = new FakeWorldIdVerificationRepository();
    runCount = 0;
    async run(operation) {
        this.runCount += 1;
        return operation({
            listingRepository: this.listingRepository,
            humanSignatureRepository: this.humanSignatureRepository,
            worldIdVerificationRepository: this.worldIdVerificationRepository,
        });
    }
}
class FakeListingRepository {
    listings = new Map();
    async save(listing) {
        this.listings.set(listing.id, listing);
    }
    async findById(listingId) {
        return this.listings.get(listingId);
    }
    async claimForPurchase(input) {
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
    async search(input) {
        return [...this.listings.values()].slice(0, input.limit ?? 50);
    }
}
class FakeHumanSignatureRepository {
    signatures = [];
    async save(signature) {
        this.signatures.push(signature);
    }
    async findValidByResourcePayload(input) {
        return this.signatures.find((signature) => {
            const snapshot = signature.snapshot;
            return (snapshot.status === "VALID" &&
                snapshot.actionType === input.actionType &&
                snapshot.resourceType === input.resourceType &&
                snapshot.resourceId === input.resourceId &&
                snapshot.payloadHash === input.payloadHash);
        });
    }
}
class FakeWorldIdVerificationRepository {
    verifications = [];
    async save(verification) {
        this.verifications.push(verification);
    }
    async countByUserAction(userId, action) {
        return this.verifications.filter((verification) => {
            const snapshot = verification.snapshot;
            return snapshot.userId === userId && snapshot.action === action;
        }).length;
    }
}
class FakeWorldIdVerifier {
    output;
    error;
    inputs = [];
    constructor(output, error) {
        this.output = output;
        this.error = error;
    }
    async verify(input) {
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
class FakeHumanSignatureSigner {
    output;
    inputs = [];
    constructor(output) {
        this.output = output;
    }
    async sign(input) {
        this.inputs.push(input);
        return ok(this.output);
    }
}
