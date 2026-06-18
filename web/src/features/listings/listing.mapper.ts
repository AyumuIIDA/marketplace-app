import type { Listing } from "../../lib/api/listings.api";
import type { ListingViewModel } from "./listing-view-model";

export function mapListingToViewModel(listing: Listing): ListingViewModel {
  return {
    id: listing.listingId,
    title: listing.title,
    price: listing.price,
    priceLabel: listing.price.toLocaleString("ja-JP"),
    currency: listing.currency,
    category: listing.category,
    sellerId: listing.sellerId,
    signed: listing.signatureId !== undefined,
    status: listing.status,
    createdAt: listing.createdAt,
    imageUrl: listing.images?.[0]?.url,
  };
}

export function mapListingsToViewModels(listings: Listing[]): ListingViewModel[] {
  return listings.map(mapListingToViewModel);
}
