export function isPurchasableListing(listing) {
    return listing.status === "PUBLISHED";
}
export function isSearchableListing(listing) {
    return listing.status === "PUBLISHED";
}
export function requiresHumanSignatureForPublish(listing) {
    return listing.status === "DRAFT";
}
export function requiresHumanSignatureForUpdate(listing) {
    return listing.status === "PUBLISHED";
}
export function canSellerMutateListing(listing, userId) {
    return listing.sellerId === userId && listing.status !== "SOLD" && listing.status !== "HIDDEN";
}
