import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { assertVerifiedWorldIdMatches, } from "../../signatures/application/index.js";
import { canSellerMutateListing } from "../domain/index.js";
import { computeListingPayloadHash, listingToSignaturePayload, } from "./listing-payload-hash.service.js";
export class PublishListingWithHumanSignatureUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const verificationResult = await this.deps.worldIdVerifier.verify({
            idKitResult: input.idKitResult,
        });
        if (!verificationResult.ok) {
            throw verificationResult.error;
        }
        assertVerifiedWorldIdMatches({
            verifiedWorldId: verificationResult.value,
            expectedAction: "LISTING_PUBLISH",
            expectedEnvironment: input.expectedEnvironment,
            expectedSignalHash: input.expectedSignalHash,
        });
        return this.deps.listingSignatureTransaction.run(async (context) => {
            const listing = await context.listingRepository.findById(input.listingId);
            if (listing === undefined) {
                throw new NotFoundError("Listing", input.listingId);
            }
            if (!canSellerMutateListing(listing, input.sellerId)) {
                throw new AuthorizationError("Only the seller can publish this listing.", {
                    listingId: input.listingId,
                    sellerId: input.sellerId,
                });
            }
            const payloadHash = computeListingPayloadHash(listingToSignaturePayload(listing));
            const signature = await this.deps.humanSignatureCreator.create({
                userId: input.sellerId,
                actionType: "LISTING_PUBLISH",
                resourceType: "LISTING",
                resourceId: input.listingId,
                payloadHash,
                verifiedWorldId: verificationResult.value,
            }, context);
            listing.publish(signature.signatureId, signature.signedAt);
            await context.listingRepository.save(listing);
            return {
                listingId: listing.id,
                signatureId: signature.signatureId,
                worldIdVerificationId: signature.worldIdVerificationId,
                verificationCount: signature.verificationCount,
                status: "PUBLISHED",
            };
        });
    }
}
