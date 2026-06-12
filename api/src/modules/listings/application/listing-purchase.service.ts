import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { isPurchasableListing, type Listing, type ListingRepository } from "../domain/index.js";

export type ListingPurchaseContext = {
  listingRepository: ListingRepository;
};

export type GetPurchasableListingInput = {
  listingId: string;
  buyerId: string;
};

export type ClaimListingForPurchaseServiceInput = {
  listingId: string;
  buyerId: string;
  soldAt: Date;
};

export class ListingPurchaseService {
  async getPurchasableListing(
    input: GetPurchasableListingInput,
    context: ListingPurchaseContext,
  ): Promise<Listing> {
    const listing = await context.listingRepository.findById(input.listingId);

    if (listing === undefined) {
      throw new NotFoundError("Listing", input.listingId);
    }

    const snapshot = listing.snapshot;

    if (snapshot.sellerId === input.buyerId) {
      throw new AuthorizationError("Seller cannot purchase their own listing.", {
        listingId: input.listingId,
        buyerId: input.buyerId,
      });
    }

    if (!isPurchasableListing(listing)) {
      throw new AuthorizationError("Listing is not purchasable.", {
        listingId: input.listingId,
        status: snapshot.status,
      });
    }

    return listing;
  }

  async claimForPurchase(
    input: ClaimListingForPurchaseServiceInput,
    context: ListingPurchaseContext,
  ): Promise<Listing> {
    const claimed = await context.listingRepository.claimForPurchase(input);

    if (claimed !== undefined) {
      return claimed;
    }

    return this.getPurchasableListing(
      {
        listingId: input.listingId,
        buyerId: input.buyerId,
      },
      context,
    );
  }
}
