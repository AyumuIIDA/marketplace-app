import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import type { Clock } from "../../../shared/index.js";
import type { ListingFields, ListingRepository } from "../domain/index.js";

import { toListingOutput, type ListingOutput } from "./listing.presenter.js";

export type UpdateDraftListingInput = {
  listingId: string;
  sellerId: string;
  fields: ListingFields;
};

export type UpdateDraftListingOutput = ListingOutput;

export type UpdateDraftListingDeps = {
  listingRepository: ListingRepository;
  clock: Clock;
};

export class UpdateDraftListingUseCase {
  constructor(private readonly deps: UpdateDraftListingDeps) {}

  async execute(input: UpdateDraftListingInput): Promise<UpdateDraftListingOutput> {
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
