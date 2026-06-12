import { createHash } from "node:crypto";
export function computeReviewPayloadHash(payload) {
    const canonicalPayload = JSON.stringify({
        reviewId: payload.reviewId,
        orderId: payload.orderId,
        reviewerId: payload.reviewerId,
        revieweeId: payload.revieweeId,
        agentId: payload.agentId ?? null,
        rating: payload.rating,
        comment: payload.comment,
    });
    return `sha256:${createHash("sha256").update(canonicalPayload, "utf8").digest("hex")}`;
}
export function reviewToSignaturePayload(review) {
    const snapshot = review.snapshot;
    return {
        reviewId: snapshot.id,
        orderId: snapshot.orderId,
        reviewerId: snapshot.reviewerId,
        revieweeId: snapshot.revieweeId,
        agentId: snapshot.agentId,
        rating: snapshot.rating,
        comment: snapshot.comment,
    };
}
