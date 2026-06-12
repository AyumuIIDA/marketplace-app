import { describe, expect, it } from "vitest";
import { AppError, DomainError, FixedClock, FixedIdGenerator, err, ok, } from "../../../shared/index.js";
import { HumanSignatureCreator } from "../../signatures/application/index.js";
import { Listing } from "../domain/index.js";
import { PublishListingWithHumanSignatureUseCase } from "./publish-listing-with-human-signature.usecase.js";
import { UpdateListingWithHumanSignatureUseCase } from "./update-listing-with-human-signature.usecase.js";
const fixedNow = new Date("2026-06-09T00:00:00.000Z");
describe("PublishListingWithHumanSignatureUseCase", () => {
    it("should create a human signature and publish a draft listing in one transaction", async () => {
        const transaction = new FakeListingSignatureTransaction();
        transaction.listingRepository.listings.set("listing-1", createDraftListing());
        const worldIdVerifier = new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_PUBLISH"));
        const useCase = createPublishUseCase(transaction, worldIdVerifier);
        const output = await useCase.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            idKitResult: createIdKitResult("LISTING_PUBLISH"),
            expectedEnvironment: "production",
        });
        const listing = transaction.listingRepository.listings.get("listing-1");
        expect(output.status).toBe("PUBLISHED");
        expect(output.signatureId).toBe("signature-1");
        expect(listing?.status).toBe("PUBLISHED");
        expect(listing?.snapshot.signatureId).toBe("signature-1");
        expect(transaction.humanSignatureRepository.signatures).toHaveLength(1);
        expect(transaction.worldIdVerificationRepository.verifications).toHaveLength(1);
        expect(transaction.runCount).toBe(1);
    });
    it("should reject mismatched World ID actions before opening a transaction", async () => {
        const transaction = new FakeListingSignatureTransaction();
        const useCase = createPublishUseCase(transaction, new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_UPDATE")));
        await expect(useCase.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            idKitResult: createIdKitResult("LISTING_UPDATE"),
            expectedEnvironment: "production",
        })).rejects.toThrow(DomainError);
        expect(transaction.runCount).toBe(0);
    });
});
describe("UpdateListingWithHumanSignatureUseCase", () => {
    it("should create a human signature and update a published listing in one transaction", async () => {
        const transaction = new FakeListingSignatureTransaction();
        const listing = createDraftListing();
        listing.publish("signature-initial", fixedNow);
        transaction.listingRepository.listings.set("listing-1", listing);
        const worldIdVerifier = new FakeWorldIdVerifier(createVerifiedWorldId("LISTING_UPDATE"));
        const useCase = createUpdateUseCase(transaction, worldIdVerifier);
        const output = await useCase.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            fields: {
                title: "Updated Sneakers",
                description: "Updated description.",
                price: 9000,
                currency: "JPY",
                category: "fashion_shoes",
                condition: "very_good",
            },
            idKitResult: createIdKitResult("LISTING_UPDATE"),
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
    it("should not open a transaction when World ID verification fails", async () => {
        const transaction = new FakeListingSignatureTransaction();
        const useCase = createUpdateUseCase(transaction, new FakeWorldIdVerifier(undefined, new AppError("WORLD_ID_VERIFICATION_FAILED", "World ID verification failed.", 400)));
        await expect(useCase.execute({
            listingId: "listing-1",
            sellerId: "seller-1",
            fields: {
                title: "Updated Sneakers",
                description: "Updated description.",
                price: 9000,
                currency: "JPY",
                category: "fashion_shoes",
                condition: "very_good",
            },
            idKitResult: createIdKitResult("LISTING_UPDATE"),
        })).rejects.toThrow(AppError);
        expect(transaction.runCount).toBe(0);
    });
});
function createPublishUseCase(transaction, worldIdVerifier) {
    return new PublishListingWithHumanSignatureUseCase({
        listingSignatureTransaction: transaction,
        worldIdVerifier,
        humanSignatureCreator: createHumanSignatureCreator(),
    });
}
function createUpdateUseCase(transaction, worldIdVerifier) {
    return new UpdateListingWithHumanSignatureUseCase({
        listingSignatureTransaction: transaction,
        worldIdVerifier,
        humanSignatureCreator: createHumanSignatureCreator(),
    });
}
function createHumanSignatureCreator() {
    return new HumanSignatureCreator({
        humanSignatureSigner: new FakeHumanSignatureSigner({
            signatureValue: "jws-signature",
            signedAt: fixedNow,
        }),
        idGenerator: new FixedIdGenerator(["verification-1", "signature-1"]),
        clock: new FixedClock(fixedNow),
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
function createVerifiedWorldId(action) {
    return {
        action,
        nullifierHash: "nullifier-1",
        verificationLevel: "orb",
        signalHash: "signal-hash-1",
        environment: "production",
        verifiedAt: fixedNow,
    };
}
function createIdKitResult(action) {
    return {
        protocol_version: "3.0",
        nonce: "nonce-1",
        action,
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
class FakeListingSignatureTransaction {
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
