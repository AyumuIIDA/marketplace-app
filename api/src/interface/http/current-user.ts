import type { Context, MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";

import { AuthenticationError, InfrastructureError } from "../../shared/index.js";

// BFFが発行する内部トークンの主体。authentication(誰か)はBFFが確定し、APIは検証のみ。
export type CurrentUser = {
  userId: string;
  sessionId?: string;
};

// jwtVerifyへ渡す検証鍵（EdDSA公開鍵）。importJWK / generateKeyPair の戻り値型。
export type BffVerificationKey = CryptoKey | Uint8Array;

export type BffAuthConfig = {
  // BFFの公開鍵（EdDSA）。Bearer検証に使う。dev headerのみ運用時はundefined可。
  publicKey?: BffVerificationKey;
  // x-user-id dev fallbackを許可するか（test / 明示的なdev環境のみ）。
  allowDevUserHeader: boolean;
  // 認証任意の公開リクエスト判定（例: 未ログインでも見られる商品閲覧GET）。
  // トークンがあれば currentUser を設定し、無くても 401 にせず通す。
  isPublicRequest?: (c: Context) => boolean;
};

const INTERNAL_ISSUER = "next-bff";
const INTERNAL_AUDIENCE = "hono-api";

declare module "hono" {
  interface ContextVariableMap {
    currentUser?: CurrentUser;
  }
}

// 認証ミドルウェア。BearerをEdDSA検証 or dev headerでCurrentUserを確定し、contextへ格納する。
export function createBffAuthMiddleware(config: BffAuthConfig): MiddlewareHandler {
  return async (c, next) => {
    const authorization = c.req.header("authorization");

    if (authorization !== undefined) {
      const token = readBearerToken(authorization);

      if (config.publicKey === undefined) {
        // 設定ミスは「クライアント認証失敗」ではなくサーバ設定エラー(500)。
        throw new InfrastructureError("BFF internal token public key is not configured.");
      }

      c.set("currentUser", await verifyBffToken(token, config.publicKey));
      await next();
      return;
    }

    if (config.allowDevUserHeader) {
      const devUser = readDevUser(c);

      if (devUser !== undefined) {
        c.set("currentUser", devUser);
        await next();
        return;
      }
    }

    // 公開リクエストは未認証でも通す（currentUser未設定＝匿名）。
    if (config.isPublicRequest?.(c) === true) {
      await next();
      return;
    }

    throw new AuthenticationError("Authentication is required.");
  };
}

// controllerはここからCurrentUserを取得する（ミドルウェアが設定済み）。認証必須routeで使う。
export function getCurrentUser(c: Context): CurrentUser {
  const currentUser = c.get("currentUser");

  if (currentUser === undefined) {
    throw new AuthenticationError("Authentication is required.");
  }

  return currentUser;
}

// 認証任意route用。匿名なら undefined を返す。
export function getOptionalUser(c: Context): CurrentUser | undefined {
  return c.get("currentUser");
}

// EdDSA署名のBFF内部トークンを検証し、CurrentUserへ確定する。
export async function verifyBffToken(
  token: string,
  publicKey: BffVerificationKey,
): Promise<CurrentUser> {
  let payload;

  try {
    ({ payload } = await jwtVerify(token, publicKey, {
      issuer: INTERNAL_ISSUER,
      audience: INTERNAL_AUDIENCE,
      algorithms: ["EdDSA"],
    }));
  } catch {
    throw new AuthenticationError("Internal bearer token is invalid or expired.");
  }

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new AuthenticationError("Internal bearer token subject is missing.");
  }

  return {
    userId: payload.sub,
    sessionId: typeof payload.sid === "string" ? payload.sid : undefined,
  };
}

function readBearerToken(authorization: string): string {
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || token === undefined || token.trim().length === 0) {
    throw new AuthenticationError("Authorization header must use the Bearer scheme.");
  }

  return token;
}

function readDevUser(c: Context): CurrentUser | undefined {
  const userId = c.req.header("x-user-id");

  if (userId === undefined || userId.trim().length === 0) {
    return undefined;
  }

  return {
    userId,
  };
}
