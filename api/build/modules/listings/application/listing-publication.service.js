import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { canSellerMutateListing } from "../domain/index.js";
export class ListingPublicationService {
    async getListingForSellerMutation(input, context) {
        const listing = await context.listingRepository.findById(input.listingId);
        if (listing === undefined) {
            throw new NotFoundError("Listing", input.listingId);
        }
        if (!canSellerMutateListing(listing, input.sellerId)) {
            throw new AuthorizationError("Only the seller can mutate this listing.", {
                listingId: input.listingId,
                sellerId: input.sellerId,
            });
        }
        return listing;
    }
    async publishWithSignature(input, context) {
        input.listing.publish(input.signatureId, input.signedAt);
        await context.listingRepository.save(input.listing);
        return {
            listingId: input.listing.id,
            status: "PUBLISHED",
        };
    }
    async updateWithSignature(input, context) {
        input.listing.updatePublishedWithSignature(input.fields, input.signatureId, input.signedAt);
        await context.listingRepository.save(input.listing);
        return {
            listingId: input.listing.id,
            status: "PUBLISHED",
        };
    }
}
