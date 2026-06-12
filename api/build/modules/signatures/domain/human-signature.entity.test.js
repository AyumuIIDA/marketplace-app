import { describe, expect, it } from "vitest";
import { DomainError } from "../../../shared/index.js";
import { HumanSignature } from "./human-signature.entity.js";
describe("HumanSignature", () => {
    it("should create a valid JWS human signature", () => {
        const signedAt = new Date("2026-06-09T00:00:00.000Z");
        const signature = HumanSignature.createValid({
            id: "signature-1",
            userId: "user-1",
            actionType: "LISTING_PUBLISH",
            resourceType: "LISTING",
            resourceId: "listing-1",
            payloadHash: "sha256:listing-payload",
            signatureValue: "jws-value",
            worldIdVerificationId: "verification-1",
            signedAt,
        });
        expect(signature.snapshot).toEqual({
            id: "signature-1",
            userId: "user-1",
            actionType: "LISTING_PUBLISH",
            resourceType: "LISTING",
            resourceId: "listing-1",
            payloadHash: "sha256:listing-payload",
            signatureFormat: "JWS",
            signatureValue: "jws-value",
            worldIdVerificationId: "verification-1",
            status: "VALID",
            signedAt,
        });
    });
    it("should reject payload hashes without sha256 prefix", () => {
        expect(() => HumanSignature.createValid({
            id: "signature-1",
            userId: "user-1",
            actionType: "LISTING_PUBLISH",
            resourceType: "LISTING",
            resourceId: "listing-1",
            payloadHash: "listing-payload",
            signatureValue: "jws-value",
            worldIdVerificationId: "verification-1",
            signedAt: new Date("2026-06-09T00:00:00.000Z"),
        })).toThrow(DomainError);
    });
    it("should revoke a valid signature", () => {
        const signature = HumanSignature.createValid({
            id: "signature-1",
            userId: "user-1",
            actionType: "LISTING_UPDATE",
            resourceType: "LISTING",
            resourceId: "listing-1",
            payloadHash: "sha256:listing-payload",
            signatureValue: "jws-value",
            worldIdVerificationId: "verification-1",
            signedAt: new Date("2026-06-09T00:00:00.000Z"),
        });
        const revokedAt = new Date("2026-06-09T01:00:00.000Z");
        signature.revoke(revokedAt);
        expect(signature.status).toBe("REVOKED");
        expect(signature.snapshot.revokedAt).toEqual(revokedAt);
    });
});
