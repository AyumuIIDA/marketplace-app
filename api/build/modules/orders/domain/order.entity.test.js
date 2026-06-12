import { describe, expect, it } from "vitest";
import { DomainError } from "../../../shared/index.js";
import { Order } from "./order.entity.js";
const fixedNow = new Date("2026-06-09T00:00:00.000Z");
describe("Order", () => {
    it("should create a paid order", () => {
        const order = createPaidOrder();
        expect(order.snapshot).toMatchObject({
            id: "order-1",
            listingId: "listing-1",
            buyerId: "buyer-1",
            sellerId: "seller-1",
            status: "PAID",
            price: 7800,
        });
    });
    it("should reject same buyer and seller", () => {
        expect(() => Order.createPaid({
            id: "order-1",
            listingId: "listing-1",
            buyerId: "seller-1",
            sellerId: "seller-1",
            price: 7800,
            now: fixedNow,
        })).toThrow(DomainError);
    });
    it("should move from paid to shipped to received", () => {
        const order = createPaidOrder();
        order.markShipped("seller-1", fixedNow);
        order.markReceived("buyer-1", fixedNow);
        expect(order.status).toBe("RECEIVED");
        expect(order.snapshot.shippedAt).toEqual(fixedNow);
        expect(order.snapshot.receivedAt).toEqual(fixedNow);
    });
    it("should reject shipping by non-seller", () => {
        const order = createPaidOrder();
        expect(() => order.markShipped("buyer-1", fixedNow)).toThrow(DomainError);
    });
});
function createPaidOrder() {
    return Order.createPaid({
        id: "order-1",
        listingId: "listing-1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        price: 7800,
        now: fixedNow,
    });
}
