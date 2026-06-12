import { describe, expect, it } from "vitest";

import { JwsHumanSignatureSigner } from "./jws-human-signature.signer.js";

describe("JwsHumanSignatureSigner", () => {
  it("should sign and verify a compact JWS human signature", async () => {
    const signer = new JwsHumanSignatureSigner({
      issuer: "human-backed-marketplace",
      secret: "test-secret",
    });
    const input = {
      signatureId: "signature-1",
      userId: "user-1",
      actionType: "LISTING_PUBLISH" as const,
      resourceType: "LISTING" as const,
      resourceId: "listing-1",
      payloadHash: "sha256:payload-1",
      worldIdVerificationId: "verification-1",
      issuedAt: new Date("2026-06-09T00:00:00.000Z"),
    };

    const signed = await signer.sign(input);

    expect(signed.ok).toBe(true);
    if (!signed.ok) {
      throw signed.error;
    }
    expect(signed.value.signatureValue.split(".")).toHaveLength(3);

    const verified = await signer.verify({
      ...input,
      signatureValue: signed.value.signatureValue,
    });

    expect(verified).toEqual({ ok: true, value: { valid: true } });
  });

  it("should reject signatures when expected claims do not match", async () => {
    const signer = new JwsHumanSignatureSigner({
      issuer: "human-backed-marketplace",
      secret: "test-secret",
    });
    const input = {
      signatureId: "signature-1",
      userId: "user-1",
      actionType: "LISTING_UPDATE" as const,
      resourceType: "LISTING" as const,
      resourceId: "listing-1",
      payloadHash: "sha256:payload-1",
      worldIdVerificationId: "verification-1",
      issuedAt: new Date("2026-06-09T00:00:00.000Z"),
    };
    const signed = await signer.sign(input);

    if (!signed.ok) {
      throw signed.error;
    }

    const verified = await signer.verify({
      ...input,
      payloadHash: "sha256:payload-2",
      signatureValue: signed.value.signatureValue,
    });

    expect(verified.ok).toBe(false);
    if (verified.ok) {
      throw new Error("Expected verification failure.");
    }
    expect(verified.error.code).toBe("JWS_CLAIMS_INVALID");
  });

  it("should reject tampered compact JWS signatures", async () => {
    const signer = new JwsHumanSignatureSigner({
      issuer: "human-backed-marketplace",
      secret: "test-secret",
    });
    const input = {
      signatureId: "signature-1",
      userId: "user-1",
      actionType: "REVIEW_SUBMIT" as const,
      resourceType: "REVIEW" as const,
      resourceId: "review-1",
      payloadHash: "sha256:payload-1",
      worldIdVerificationId: "verification-1",
      issuedAt: new Date("2026-06-09T00:00:00.000Z"),
    };
    const signed = await signer.sign(input);

    if (!signed.ok) {
      throw signed.error;
    }

    const verified = await signer.verify({
      ...input,
      signatureValue: `${signed.value.signatureValue.slice(0, -1)}x`,
    });

    expect(verified.ok).toBe(false);
    if (verified.ok) {
      throw new Error("Expected verification failure.");
    }
    expect(verified.error.code).toBe("JWS_SIGNATURE_INVALID");
  });
});

