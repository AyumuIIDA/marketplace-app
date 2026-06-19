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
  // scope を付けるとトークンの用途を区別できる（例: "mcp" = エージェント接続用 PAT）。
  // API 検証は iss/aud/sig/exp のみで通すため scope は任意。監査・将来の権限制御の足場。
  scope?: string;
}): Promise<string> {
  const key = await privateKey();

  return new SignJWT({
    sid: input.sessionId,
    scope: input.scope,
  })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer("next-bff")
    .setAudience("hono-api")
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${input.expiresInSeconds ?? 60}s`)
    .sign(key);
}

// MCP クライアント（外部エージェント）に持たせる Personal Access Token を発行する。
// BFF のセッショントークンとは別建て: scope="mcp"、寿命は長め（既定 24h）、sid なし。
// 署名鍵・検証経路は内部トークンと共通（web=秘密鍵で署名 / api=公開鍵で検証）。
export async function signAgentAccessToken(input: {
  userId: string;
  expiresInSeconds?: number;
}): Promise<string> {
  return signInternalToken({
    userId: input.userId,
    scope: "mcp",
    expiresInSeconds: input.expiresInSeconds ?? 60 * 60 * 24,
  });
}
