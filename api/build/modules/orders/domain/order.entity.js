import { DomainError } from "../../../shared/index.js";
export class Order {
    props;
    constructor(props) {
        this.props = props;
    }
    static createPaid(input) {
        if (input.buyerId === input.sellerId) {
            throw new DomainError("ORDER_BUYER_SELLER_SAME", "Buyer and seller must be different.", {
                buyerId: input.buyerId,
                sellerId: input.sellerId,
            });
        }
        validatePositivePrice(input.price);
        return new Order({
            id: input.id,
            listingId: input.listingId,
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            status: "PAID",
            price: input.price,
            currency: input.currency ?? "JPY",
            createdAt: input.now,
            paidAt: input.now,
        });
    }
    static rehydrate(props) {
        return new Order({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get buyerId() {
        return this.props.buyerId;
    }
    get sellerId() {
        return this.props.sellerId;
    }
    get status() {
        return this.props.status;
    }
    get snapshot() {
        return { ...this.props };
    }
    markShipped(actorId, now) {
        if (actorId !== this.props.sellerId) {
            throw new DomainError("ORDER_SHIPPER_NOT_SELLER", "Only the seller can mark an order shipped.", {
                orderId: this.props.id,
                actorId,
            });
        }
        if (this.props.status !== "PAID") {
            throw new DomainError("ORDER_NOT_SHIPPABLE", "Only paid orders can be marked shipped.", {
                orderId: this.props.id,
                status: this.props.status,
            });
        }
        this.props = {
            ...this.props,
            status: "SHIPPED",
            shippedAt: now,
        };
    }
    markReceived(actorId, now) {
        if (actorId !== this.props.buyerId) {
            throw new DomainError("ORDER_RECEIVER_NOT_BUYER", "Only the buyer can mark an order received.", {
                orderId: this.props.id,
                actorId,
            });
        }
        if (this.props.status !== "SHIPPED") {
            throw new DomainError("ORDER_NOT_RECEIVABLE", "Only shipped orders can be marked received.", {
                orderId: this.props.id,
                status: this.props.status,
            });
        }
        this.props = {
            ...this.props,
            status: "RECEIVED",
            receivedAt: now,
        };
    }
    completeAfterReviews(now) {
        if (this.props.status !== "RECEIVED") {
            throw new DomainError("ORDER_NOT_COMPLETABLE", "Only received orders can be completed.", {
                orderId: this.props.id,
                status: this.props.status,
            });
        }
        this.props = {
            ...this.props,
            status: "COMPLETED",
            completedAt: now,
        };
    }
    cancel(actorId, now) {
        if (actorId !== this.props.buyerId && actorId !== this.props.sellerId) {
            throw new DomainError("ORDER_CANCEL_ACTOR_INVALID", "Only order participants can cancel an order.", {
                orderId: this.props.id,
                actorId,
            });
        }
        if (this.props.status !== "PAID") {
            throw new DomainError("ORDER_NOT_CANCELABLE", "Only paid orders can be canceled.", {
                orderId: this.props.id,
                status: this.props.status,
            });
        }
        this.props = {
            ...this.props,
            status: "CANCELED",
            canceledAt: now,
        };
    }
}
export function validatePositivePrice(price) {
    if (!Number.isInteger(price) || price <= 0) {
        throw new DomainError("ORDER_PRICE_INVALID", "Order price must be a positive integer.", {
            price,
        });
    }
}
