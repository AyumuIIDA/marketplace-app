import { describe, expect, it } from "vitest";
import { DomainError } from "../../../shared/index.js";
import { Listing } from "./listing.entity.js";
const now = new Date("2026-06-09T00:00:00.000Z");
const later = new Date("2026-06-09T01:00:00.000Z");
const validFields = {
    title: "Updated Sneakers",
    description: "Updated description.",
    price: 8200,
    currency: "JPY",
    category: "fashion_shoes",
    condition: "very_good",
};
describe("Listing", () => {
    it("should create a draft listing", () => {
        const listing = Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            category: "fashion_shoes",
            condition: "good",
            now,
        });
        expect(listing.snapshot).toMatchObject({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            price: 7800,
            currency: "JPY",
            status: "DRAFT",
            createdAt: now,
            updatedAt: now,
        });
    });
    it("should reject an empty title", () => {
        expect(() => Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: " ",
            description: "Used a few times.",
            price: 7800,
            category: "fashion_shoes",
            condition: "good",
            now,
        })).toThrow(DomainError);
    });
    it("should reject a non-positive price", () => {
        expect(() => Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 0,
            category: "fashion_shoes",
            condition: "good",
            now,
        })).toThrow(DomainError);
    });
    it("should publish a draft listing with a signature", () => {
        const listing = Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            category: "fashion_shoes",
            condition: "good",
            now,
        });
        const publishedAt = new Date("2026-06-09T01:00:00.000Z");
        listing.publish("signature_1", publishedAt);
        expect(listing.snapshot).toMatchObject({
            status: "PUBLISHED",
            signatureId: "signature_1",
            publishedAt,
            updatedAt: publishedAt,
        });
    });
    it("should update a draft listing without a new signature", () => {
        const listing = Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            category: "fashion_shoes",
            condition: "good",
            now,
        });
        listing.updateDraft(validFields, later);
        expect(listing.snapshot).toMatchObject({
            title: "Updated Sneakers",
            description: "Updated description.",
            price: 8200,
            condition: "very_good",
            status: "DRAFT",
            updatedAt: later,
        });
        expect(listing.snapshot.signatureId).toBeUndefined();
    });
    it("should not update a published listing as a draft update", () => {
        const listing = Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            category: "fashion_shoes",
            condition: "good",
            now,
        });
        listing.publish("signature_1", later);
        expect(() => listing.updateDraft(validFields, later)).toThrow(DomainError);
    });
    it("should update a published listing with a new signature", () => {
        const listing = Listing.createDraft({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            category: "fashion_shoes",
            condition: "good",
            now,
        });
        listing.publish("signature_1", later);
        const updatedAt = new Date("2026-06-09T02:00:00.000Z");
        listing.updatePublishedWithSignature(validFields, "signature_2", updatedAt);
        expect(listing.snapshot).toMatchObject({
            title: "Updated Sneakers",
            price: 8200,
            status: "PUBLISHED",
            signatureId: "signature_2",
            updatedAt,
        });
    });
    it("should not update a sold listing with a signature", () => {
        const listing = Listing.rehydrate({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            currency: "JPY",
            category: "fashion_shoes",
            condition: "good",
            status: "SOLD",
            createdAt: now,
            updatedAt: now,
            soldAt: now,
        });
        expect(() => listing.updatePublishedWithSignature(validFields, "signature_2", later)).toThrow(DomainError);
    });
    it("should not publish a sold listing", () => {
        const listing = Listing.rehydrate({
            id: "listing_1",
            sellerId: "seller_1",
            title: "Sneakers",
            description: "Used a few times.",
            price: 7800,
            currency: "JPY",
            category: "fashion_shoes",
            condition: "good",
            status: "SOLD",
            createdAt: now,
            updatedAt: now,
            soldAt: now,
        });
        expect(() => listing.publish("signature_1", now)).toThrow(DomainError);
    });
});
