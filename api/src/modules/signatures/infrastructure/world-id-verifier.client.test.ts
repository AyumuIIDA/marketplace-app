import { describe, expect, it } from "vitest";

import { WorldIdVerifierClient } from "./world-id-verifier.client.js";

describe("WorldIdVerifierClient", () => {
  it("should call World ID v4 verify endpoint and map successful responses", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const client = new WorldIdVerifierClient({
      rpId: "rp_test",
      endpointBaseUrl: "https://developer.world.org",
      fetchFn: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response(
          JSON.stringify({
            success: true,
            action: "LISTING_PUBLISH",
            nullifier: "verified-nullifier",
            created_at: "2026-06-09T00:00:00.000Z",
            environment: "production",
            results: [{ identifier: "orb", success: true, nullifier: "verified-nullifier" }],
          }),
          { status: 200 },
        );
      },
    });
    const idKitResult = createIdKitResult();

    const result = await client.verify({
      idKitResult,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        action: "LISTING_PUBLISH",
        nullifierHash: "verified-nullifier",
        verificationLevel: "orb",
        signalHash: "signal-hash-1",
        environment: "production",
        verifiedAt: new Date("2026-06-09T00:00:00.000Z"),
      },
    });
    expect(requests[0]?.url).toBe("https://developer.world.org/api/v4/verify/rp_test");
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual(idKitResult);
  });

  it("should return an AppError when World ID verification fails", async () => {
    const client = new WorldIdVerifierClient({
      rpId: "rp_test",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            success: false,
            message: "Verification limit reached.",
            results: [{ identifier: "orb", success: false, code: "verification_limit_reached" }],
          }),
          { status: 200 },
        ),
    });

    const result = await client.verify({
      idKitResult: createIdKitResult(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected verification failure.");
    }
    expect(result.error.code).toBe("WORLD_ID_VERIFICATION_FAILED");
  });
});

function createIdKitResult() {
  return {
    protocol_version: "3.0",
    nonce: "nonce-1",
    action: "LISTING_PUBLISH",
    environment: "production",
    responses: [
      {
        identifier: "orb",
        signal_hash: "signal-hash-1",
        proof: "proof-1",
        merkle_root: "merkle-root-1",
        nullifier: "nullifier-1",
      },
    ],
  };
}
