import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
export class HideListingUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const listing = await this.deps.listingRepository.findById(input.listingId);
        if (listing === undefined) {
            throw new NotFoundError("Listing", input.listingId);
        }
        if (listing.sellerId !== input.sellerId) {
            throw new AuthorizationError("Only the seller can hide this listing.", {
                listingId: input.listingId,
                sellerId: input.sellerId,
            });
        }
        listing.hide(this.deps.clock.now());
        await this.deps.listingRepository.save(listing);
        return {
            listingId: listing.id,
            status: "HIDDEN",
        };
    }
}
