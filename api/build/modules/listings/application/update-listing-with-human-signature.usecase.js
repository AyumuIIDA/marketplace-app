import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { assertVerifiedWorldIdMatches, } from "../../signatures/application/index.js";
import { canSellerMutateListing } from "../domain/index.js";
import { computeListingPayloadHash } from "./listing-payload-hash.service.js";
export class UpdateListingWithHumanSignatureUseCase {
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
            expectedAction: "LISTING_UPDATE",
            expectedEnvironment: input.expectedEnvironment,
            expectedSignalHash: input.expectedSignalHash,
        });
        return this.deps.listingSignatureTransaction.run(async (context) => {
            const listing = await context.listingRepository.findById(input.listingId);
            if (listing === undefined) {
                throw new NotFoundError("Listing", input.listingId);
            }
            if (!canSellerMutateListing(listing, input.sellerId)) {
                throw new AuthorizationError("Only the seller can update this listing.", {
                    listingId: input.listingId,
                    sellerId: input.sellerId,
                });
            }
            const current = listing.snapshot;
            const payloadHash = computeListingPayloadHash({
                listingId: current.id,
                sellerId: current.sellerId,
                agentId: current.agentId,
                ...input.fields,
            });
            const signature = await this.deps.humanSignatureCreator.create({
                userId: input.sellerId,
                actionType: "LISTING_UPDATE",
                resourceType: "LISTING",
                resourceId: input.listingId,
                payloadHash,
                verifiedWorldId: verificationResult.value,
            }, context);
            listing.updatePublishedWithSignature(input.fields, signature.signatureId, signature.signedAt);
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
