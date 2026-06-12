export function toListingOutput(listing) {
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
        status: snapshot.status,
        signatureId: snapshot.signatureId,
        createdAt: snapshot.createdAt.toISOString(),
        updatedAt: snapshot.updatedAt.toISOString(),
        publishedAt: snapshot.publishedAt?.toISOString(),
        soldAt: snapshot.soldAt?.toISOString(),
    };
}
