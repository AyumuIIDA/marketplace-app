import type { Listing } from "./listing.entity.js";

export function isPurchasableListing(listing: Listing): boolean {
  return listing.status === "PUBLISHED";
}

export function isSearchableListing(listing: Listing): boolean {
  return listing.status === "PUBLISHED";
}

export function requiresHumanSignatureForPublish(listing: Listing): boolean {
  return listing.status === "DRAFT";
}

export function requiresHumanSignatureForUpdate(listing: Listing): boolean {
  return listing.status === "PUBLISHED";
}

export function canSellerMutateListing(listing: Listing, userId: string): boolean {
  return listing.sellerId === userId && listing.status !== "SOLD" && listing.status !== "HIDDEN";
}
