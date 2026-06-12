export function toReviewOutput(review) {
    const snapshot = review.snapshot;
    return {
        reviewId: snapshot.id,
        orderId: snapshot.orderId,
        reviewerId: snapshot.reviewerId,
        revieweeId: snapshot.revieweeId,
        agentId: snapshot.agentId,
        rating: snapshot.rating,
        comment: snapshot.comment,
        status: snapshot.status,
        signatureId: snapshot.signatureId,
        createdAt: snapshot.createdAt.toISOString(),
        submittedAt: snapshot.submittedAt?.toISOString(),
        hiddenAt: snapshot.hiddenAt?.toISOString(),
    };
}
