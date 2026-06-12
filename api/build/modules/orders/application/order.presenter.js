export function toOrderOutput(order) {
    const snapshot = order.snapshot;
    return {
        orderId: snapshot.id,
        listingId: snapshot.listingId,
        buyerId: snapshot.buyerId,
        sellerId: snapshot.sellerId,
        status: snapshot.status,
        price: snapshot.price,
        currency: snapshot.currency,
        createdAt: snapshot.createdAt.toISOString(),
        paidAt: snapshot.paidAt?.toISOString(),
        shippedAt: snapshot.shippedAt?.toISOString(),
        receivedAt: snapshot.receivedAt?.toISOString(),
        completedAt: snapshot.completedAt?.toISOString(),
        canceledAt: snapshot.canceledAt?.toISOString(),
    };
}
