import type { Listing } from "./listing.entity.js";
import type { ListingStatus } from "./listing-status.type.js";

export type ClaimListingForPurchaseInput = {
  listingId: string;
  buyerId: string;
  soldAt: Date;
};

export type SearchListingsInput = {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  status?: ListingStatus;
  sellerId?: string;
  limit?: number;
};

// listing_images への永続化入力。hashは保存に必要（重複検出・content-addressed key）。
export type SaveListingImagesInput = {
  listingId: string;
  images: { url: string; hash: string; sortOrder: number }[];
};

export interface ListingRepository {
  save(listing: Listing): Promise<void>;
  saveImages(input: SaveListingImagesInput): Promise<void>;
  findById(listingId: string): Promise<Listing | undefined>;
  claimForPurchase(input: ClaimListingForPurchaseInput): Promise<Listing | undefined>;
  search(input: SearchListingsInput): Promise<Listing[]>;
}
