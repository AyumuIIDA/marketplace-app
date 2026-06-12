import { createHash } from "node:crypto";
export function computeListingPayloadHash(payload) {
    const canonicalPayload = JSON.stringify({
        listingId: payload.listingId,
        sellerId: payload.sellerId,
        agentId: payload.agentId ?? null,
        title: payload.title,
        description: payload.description,
        price: payload.price,
        currency: payload.currency,
        category: payload.category,
        condition: payload.condition,
    });
    return `sha256:${createHash("sha256").update(canonicalPayload, "utf8").digest("hex")}`;
}
export function listingToSignaturePayload(listing) {
    const snapshot = listing.snapshot;
    return {
        listingId: snapshot.id,
        sellerId: snapshot.sellerId,
        agentId: snapshot.agentId,
        title: snapshot.title,
        description: snapshot.description,
        price: snapshot.price,
        currency: snapshot.currency,
        category: snapshot.category,
        condition: snapshot.condition,
    };
}
