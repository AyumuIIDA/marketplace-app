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

export interface ListingRepository {
  save(listing: Listing): Promise<void>;
  findById(listingId: string): Promise<Listing | undefined>;
  claimForPurchase(input: ClaimListingForPurchaseInput): Promise<Listing | undefined>;
  search(input: SearchListingsInput): Promise<Listing[]>;
}
