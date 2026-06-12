import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { isSearchableListing } from "../domain/index.js";
import { toListingOutput } from "./listing.presenter.js";
export class GetListingUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const listing = await this.deps.listingRepository.findById(input.listingId);
        if (listing === undefined) {
            throw new NotFoundError("Listing", input.listingId);
        }
        const snapshot = listing.snapshot;
        if (!isSearchableListing(listing) && snapshot.sellerId !== input.requesterId) {
            throw new AuthorizationError("Only the seller can view this listing.", {
                listingId: input.listingId,
                requesterId: input.requesterId,
            });
        }
        return toListingOutput(listing);
    }
}
