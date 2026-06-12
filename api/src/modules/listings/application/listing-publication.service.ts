import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { canSellerMutateListing, type Listing, type ListingFields } from "../domain/index.js";
import type { ListingRepository } from "../domain/index.js";

export type ListingPublicationContext = {
  listingRepository: ListingRepository;
};

export type GetListingForSellerMutationInput = {
  listingId: string;
  sellerId: string;
};

export type PublishListingWithSignatureInput = {
  listing: Listing;
  signatureId: string;
  signedAt: Date;
};

export type UpdateListingWithSignatureInput = {
  listing: Listing;
  fields: ListingFields;
  signatureId: string;
  signedAt: Date;
};

export type ListingMutationOutput = {
  listingId: string;
  status: "PUBLISHED";
};

export class ListingPublicationService {
  async getListingForSellerMutation(
    input: GetListingForSellerMutationInput,
    context: ListingPublicationContext,
  ): Promise<Listing> {
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

  async publishWithSignature(
    input: PublishListingWithSignatureInput,
    context: ListingPublicationContext,
  ): Promise<ListingMutationOutput> {
    input.listing.publish(input.signatureId, input.signedAt);
    await context.listingRepository.save(input.listing);

    return {
      listingId: input.listing.id,
      status: "PUBLISHED",
    };
  }

  async updateWithSignature(
    input: UpdateListingWithSignatureInput,
    context: ListingPublicationContext,
  ): Promise<ListingMutationOutput> {
    input.listing.updatePublishedWithSignature(input.fields, input.signatureId, input.signedAt);
    await context.listingRepository.save(input.listing);

    return {
      listingId: input.listing.id,
      status: "PUBLISHED",
    };
  }
}
