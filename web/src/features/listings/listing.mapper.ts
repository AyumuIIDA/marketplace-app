import type { Listing } from "../../lib/api/listings.api";
import type { ListingViewModel } from "./listing-view-model";

export function mapListingToViewModel(listing: Listing, liked = false, saved = false): ListingViewModel {
  return {
    id: listing.listingId,
    title: listing.title,
    price: listing.price,
    priceLabel: listing.price.toLocaleString("ja-JP"),
    currency: listing.currency,
    category: listing.category,
    sellerId: listing.sellerId,
    sellerVerified: listing.sellerVerified === true,
    status: listing.status,
    createdAt: listing.createdAt,
    imageUrl: listing.images?.[0]?.url,
    liked,
    saved,
    likeCount: listing.likeCount,
    commentCount: listing.commentCount,
  };
}

// likedIds/savedIds を渡すと各出品の初期いいね/保存状態を hydrate する（未指定は全て false）。
export function mapListingsToViewModels(
  listings: Listing[],
  likedIds?: Set<string>,
  savedIds?: Set<string>,
): ListingViewModel[] {
  return listings.map((listing) =>
    mapListingToViewModel(
      listing,
      likedIds?.has(listing.listingId) ?? false,
      savedIds?.has(listing.listingId) ?? false,
    ),
  );
}
