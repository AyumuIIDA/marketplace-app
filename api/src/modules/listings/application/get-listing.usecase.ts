import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { isSearchableListing, type ListingRepository } from "../domain/index.js";

import { toListingOutput, type ListingOutput } from "./listing.presenter.js";

export type GetListingInput = {
  listingId: string;
  requesterId?: string;
};

export type GetListingOutput = ListingOutput;

export type GetListingDeps = {
  listingRepository: ListingRepository;
};

export class GetListingUseCase {
  constructor(private readonly deps: GetListingDeps) {}

  async execute(input: GetListingInput): Promise<GetListingOutput> {
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
