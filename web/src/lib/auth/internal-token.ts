import { SignJWT, importJWK, type JWK } from "jose";

import { requiredEnv } from "./env";

// BFF -> API の内部トークンを EdDSA 秘密鍵で署名する。
// 秘密鍵は BFF のみが保持（BFF_INTERNAL_JWT_PRIVATE_KEY）。API は公開鍵で検証のみ。
let privateKeyPromise: Promise<CryptoKey | Uint8Array> | undefined;

function privateKey(): Promise<CryptoKey | Uint8Array> {
  privateKeyPromise ??= importJWK(
    JSON.parse(requiredEnv("BFF_INTERNAL_JWT_PRIVATE_KEY")) as JWK,
    "EdDSA",
  );

  return privateKeyPromise;
}

export async function signInternalToken(input: {
  userId: string;
  sessionId?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const key = await privateKey();

  return new SignJWT({
    sid: input.sessionId,
  })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer("next-bff")
    .setAudience("hono-api")
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${input.expiresInSeconds ?? 60}s`)
    .sign(key);
}
