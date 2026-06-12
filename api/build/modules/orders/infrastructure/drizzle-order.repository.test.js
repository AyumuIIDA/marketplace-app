import { describe, expect, it } from "vitest";
import { AppError } from "../../../shared/index.js";
import { toOrderPersistenceError } from "./drizzle-order.repository.js";
describe("toOrderPersistenceError", () => {
    it("should convert listing order unique violations to an application conflict error", () => {
        const error = toOrderPersistenceError({
            code: "23505",
            constraint: "orders_listing_id_uidx",
        }, "listing-1");
        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({
            code: "LISTING_ALREADY_ORDERED",
            statusCode: 409,
            details: {
                listingId: "listing-1",
            },
        });
    });
    it("should leave unrelated database errors unchanged", () => {
        const originalError = {
            code: "23503",
            constraint: "orders_buyer_id_users_id_fk",
        };
        const error = toOrderPersistenceError(originalError, "listing-1");
        expect(error).toBe(originalError);
    });
});
