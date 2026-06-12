export const LISTING_STATUSES = ["DRAFT", "PUBLISHED", "SOLD", "HIDDEN"] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];
