import { describe, expect, it } from "vitest";
import { SignJWT, generateKeyPair } from "jose";

import { AuthenticationError } from "../../shared/index.js";

import { verifyBffToken } from "./current-user.js";

async function signToken(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
  options: { issuer?: string; audience?: string; expiresInSeconds?: number } = {},
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer(options.issuer ?? "next-bff")
    .setAudience(options.audience ?? "hono-api")
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + (options.expiresInSeconds ?? 3600))
    .sign(privateKey);
}

describe("verifyBffToken (EdDSA)", () => {
  it("verifies a BFF-signed token and maps claims to CurrentUser", async () => {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA");
    const token = await signToken(privateKey as CryptoKey, {
      sub: "user-1",
      sid: "session-1",
    });

    await expect(verifyBffToken(token, publicKey)).resolves.toEqual({
      userId: "user-1",
      sessionId: "session-1",
    });
  });

  it("rejects a token signed by a different key", async () => {
    const signer = await generateKeyPair("EdDSA");
    const other = await generateKeyPair("EdDSA");
    const token = await signToken(signer.privateKey as CryptoKey, { sub: "user-1" });

    await expect(verifyBffToken(token, other.publicKey)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects an expired token", async () => {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA");
    const token = await signToken(privateKey as CryptoKey, { sub: "user-1" }, { expiresInSeconds: -10 });

    await expect(verifyBffToken(token, publicKey)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects a token with the wrong issuer/audience", async () => {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA");
    const token = await signToken(privateKey as CryptoKey, { sub: "user-1" }, { issuer: "evil" });

    await expect(verifyBffToken(token, publicKey)).rejects.toBeInstanceOf(AuthenticationError);
  });
});
