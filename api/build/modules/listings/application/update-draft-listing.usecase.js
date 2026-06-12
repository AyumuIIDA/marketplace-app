import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { toListingOutput } from "./listing.presenter.js";
export class UpdateDraftListingUseCase {
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
            throw new AuthorizationError("Only the seller can update this listing.", {
                listingId: input.listingId,
                sellerId: input.sellerId,
            });
        }
        listing.updateDraft(input.fields, this.deps.clock.now());
        await this.deps.listingRepository.save(listing);
        return toListingOutput(listing);
    }
}
