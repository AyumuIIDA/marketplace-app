import { describe, expect, it } from "vitest";
import { DomainError } from "../../../shared/index.js";
import { WorldIdVerification } from "./world-id-verification.entity.js";
describe("WorldIdVerification", () => {
    it("should create a World ID verification history record", () => {
        const verifiedAt = new Date("2026-06-09T00:00:00.000Z");
        const now = new Date("2026-06-09T00:00:01.000Z");
        const verification = WorldIdVerification.create({
            id: "verification-1",
            userId: "user-1",
            action: "LISTING_PUBLISH",
            nullifierHash: "nullifier-1",
            verificationLevel: "orb",
            signalHash: "sha256:signal",
            environment: "production",
            verifiedAt,
            now,
        });
        expect(verification.snapshot).toEqual({
            id: "verification-1",
            userId: "user-1",
            action: "LISTING_PUBLISH",
            nullifierHash: "nullifier-1",
            verificationLevel: "orb",
            signalHash: "sha256:signal",
            environment: "production",
            verifiedAt,
            createdAt: now,
        });
    });
    it("should reject an empty action", () => {
        expect(() => WorldIdVerification.create({
            id: "verification-1",
            userId: "user-1",
            action: " ",
            nullifierHash: "nullifier-1",
            verificationLevel: "orb",
            environment: "production",
            verifiedAt: new Date("2026-06-09T00:00:00.000Z"),
            now: new Date("2026-06-09T00:00:01.000Z"),
        })).toThrow(DomainError);
    });
});
