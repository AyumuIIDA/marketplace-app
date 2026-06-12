import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import type { Clock } from "../../../shared/index.js";
import type { ListingRepository } from "../domain/index.js";

export type HideListingInput = {
  listingId: string;
  sellerId: string;
};

export type HideListingOutput = {
  listingId: string;
  status: "HIDDEN";
};

export type HideListingDeps = {
  listingRepository: ListingRepository;
  clock: Clock;
};

export class HideListingUseCase {
  constructor(private readonly deps: HideListingDeps) {}

  async execute(input: HideListingInput): Promise<HideListingOutput> {
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
