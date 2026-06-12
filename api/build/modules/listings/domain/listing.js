import { DomainError } from "../../../shared/index.js";
export class Listing {
    props;
    constructor(props) {
        this.props = props;
    }
    static createDraft(input) {
        validateListingText("title", input.title);
        validateListingText("description", input.description);
        validatePositivePrice(input.price);
        return new Listing({
            id: input.id,
            sellerId: input.sellerId,
            agentId: input.agentId,
            title: input.title,
            description: input.description,
            price: input.price,
            currency: input.currency ?? "JPY",
            category: input.category,
            condition: input.condition,
            status: "DRAFT",
            createdAt: input.now,
            updatedAt: input.now,
        });
    }
    static rehydrate(props) {
        return new Listing({ ...props });
    }
    get id() {
        return this.props.id;
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
    publish(signatureId, now) {
        if (this.props.status !== "DRAFT") {
            throw new DomainError("LISTING_NOT_PUBLISHABLE", "Only draft listings can be published.", { listingId: this.props.id, status: this.props.status });
        }
        this.props = {
            ...this.props,
            status: "PUBLISHED",
            signatureId,
            publishedAt: now,
            updatedAt: now,
        };
    }
    markSold(now) {
        if (this.props.status !== "PUBLISHED") {
            throw new DomainError("LISTING_NOT_PURCHASABLE", "Only published listings can be purchased.", { listingId: this.props.id, status: this.props.status });
        }
        this.props = {
            ...this.props,
            status: "SOLD",
            soldAt: now,
            updatedAt: now,
        };
    }
    hide(now) {
        this.props = {
            ...this.props,
            status: "HIDDEN",
            updatedAt: now,
        };
    }
}
export function validateListingText(field, value) {
    if (value.trim().length === 0) {
        throw new DomainError("LISTING_FIELD_REQUIRED", `${field} is required.`, { field });
    }
}
export function validatePositivePrice(price) {
    if (!Number.isInteger(price) || price <= 0) {
        throw new DomainError("LISTING_PRICE_INVALID", "Listing price must be a positive integer.", {
            price,
        });
    }
}
