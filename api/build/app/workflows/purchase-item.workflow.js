export class PurchaseItemWorkflow {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        if (!input.confirmed) {
            return {
                status: "REQUIRES_CONFIRMATION",
                listingId: input.listingId,
            };
        }
        return this.deps.transaction.run(async (context) => {
            const listing = await this.deps.listingPurchaseService.claimForPurchase({
                listingId: input.listingId,
                buyerId: input.buyerId,
                soldAt: this.deps.clock.now(),
            }, context);
            const snapshot = listing.snapshot;
            const order = await this.deps.orderFulfillmentService.createPaidOrder({
                listingId: snapshot.id,
                buyerId: input.buyerId,
                sellerId: snapshot.sellerId,
                price: snapshot.price,
                currency: snapshot.currency,
            }, context);
            return {
                status: "PAID",
                order,
            };
        });
    }
}
