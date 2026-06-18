import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import type { Clock } from "../../../shared/index.js";
import type { ListingRepository } from "../domain/index.js";

export type PublishListingInput = {
  listingId: string;
  sellerId: string;
};

export type PublishListingOutput = {
  listingId: string;
  status: "PUBLISHED";
};

export type PublishListingDeps = {
  listingRepository: ListingRepository;
  clock: Clock;
};

// World ID署名なしの公開。login のみで出品可能にする経路。
// 署名付き公開は publish-listing-with-human-signature.workflow が担う。
export class PublishListingUseCase {
  constructor(private readonly deps: PublishListingDeps) {}

  async execute(input: PublishListingInput): Promise<PublishListingOutput> {
    const listing = await this.deps.listingRepository.findById(input.listingId);

    if (listing === undefined) {
      throw new NotFoundError("Listing", input.listingId);
    }

    if (listing.sellerId !== input.sellerId) {
      throw new AuthorizationError("Only the seller can publish this listing.", {
        listingId: input.listingId,
        sellerId: input.sellerId,
      });
    }

    listing.publish(undefined, this.deps.clock.now());
    await this.deps.listingRepository.save(listing);

    return {
      listingId: listing.id,
      status: "PUBLISHED",
    };
  }
}
