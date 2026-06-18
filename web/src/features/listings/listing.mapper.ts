import type { Listing } from "../../lib/api/listings.api";
import type { ListingViewModel } from "./listing-view-model";

export function mapListingToViewModel(listing: Listing, liked = false): ListingViewModel {
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
    liked,
    likeCount: listing.likeCount,
    commentCount: listing.commentCount,
  };
}

// likedIds を渡すと各出品の初期いいね状態を hydrate する（未指定は全て未いいね）。
export function mapListingsToViewModels(listings: Listing[], likedIds?: Set<string>): ListingViewModel[] {
  return listings.map((listing) => mapListingToViewModel(listing, likedIds?.has(listing.listingId) ?? false));
}
