import { describe, expect, it } from "vitest";
import { DomainError } from "../../../shared/index.js";
import { User } from "./user.entity.js";
const fixedNow = new Date("2026-06-09T00:00:00.000Z");
describe("User", () => {
    it("should create an active user", () => {
        const user = User.create({
            id: "user-1",
            displayName: "Seller One",
            email: "seller@example.com",
            now: fixedNow,
        });
        expect(user.snapshot).toMatchObject({
            id: "user-1",
            displayName: "Seller One",
            email: "seller@example.com",
            status: "ACTIVE",
        });
    });
    it("should reject an invalid email", () => {
        expect(() => User.create({
            id: "user-1",
            displayName: "Seller One",
            email: "not-email",
            now: fixedNow,
        })).toThrow(DomainError);
    });
});
