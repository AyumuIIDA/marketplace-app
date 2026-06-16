import { type NextRequest, NextResponse } from "next/server";

import { auth } from "../../../auth";
import { requiredEnv } from "../auth/env";
import { signInternalToken } from "../auth/internal-token";

const allowedPrefixes = [
  "agents",
  "ai-assistance",
  "listings",
  "messages",
  "orders",
  "reviews",
  "me",
  "mcp",
] as const;

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// OAuth Proxy: Auth.js セッションを読み、EdDSA 内部トークンを付与して Hono API へ転送する。
export async function proxyToHono(request: NextRequest, path: string[]): Promise<Response> {
  const session = await auth();

  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: { code: "NOT_AUTHENTICATED" } }, { status: 401 });
  }

  const prefix = path[0];

  if (prefix === undefined || !allowedPrefixes.includes(prefix as (typeof allowedPrefixes)[number])) {
    return NextResponse.json({ error: { code: "BFF_ROUTE_NOT_ALLOWED" } }, { status: 404 });
  }

  // CSRF対策: 状態変更系は Origin を厳格検証する（SameSite だけでは不十分なため）。
  if (stateChangingMethods.has(request.method)) {
    const origin = request.headers.get("origin");

    if (origin === null || origin !== requiredEnv("NEXT_PUBLIC_APP_BASE_URL")) {
      return NextResponse.json({ error: { code: "CSRF_ORIGIN_INVALID" } }, { status: 403 });
    }
  }

  const target = new URL(`/${path.join("/")}`, requiredEnv("HONO_API_BASE_URL"));
  target.search = request.nextUrl.search;
  const headers = new Headers(request.headers);

  headers.delete("cookie");
  headers.delete("host");
  headers.set(
    "authorization",
    `Bearer ${await signInternalToken({
      userId: session.user.id,
    })}`,
  );

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    redirect: "manual",
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: filterResponseHeaders(response.headers),
  });
}

function filterResponseHeaders(headers: Headers): Headers {
  const filtered = new Headers(headers);

  filtered.delete("set-cookie");
  filtered.delete("transfer-encoding");

  return filtered;
}
