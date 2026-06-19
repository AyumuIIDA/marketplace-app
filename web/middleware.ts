import { NextResponse, type NextRequest } from "next/server";

import { FEED_SEED_COOKIE } from "./src/lib/feed/seed";

// 一覧の shuffle（おすすめ順）用 seed を初回アクセス時に発行する。
// セッションクッキー（maxAge/expires 無し）＝ブラウザを閉じるまで一貫し、閉じれば次回は別の並びになる。
// 同一リクエストの RSC でも読めるよう、request にも載せてから NextResponse に転送する。
export function middleware(request: NextRequest) {
  if (request.cookies.has(FEED_SEED_COOKIE)) {
    return NextResponse.next();
  }

  const seed = crypto.randomUUID();
  request.cookies.set(FEED_SEED_COOKIE, seed);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(FEED_SEED_COOKIE, seed, { path: "/", sameSite: "lax" });
  return response;
}

// seed を使うのは一覧系（ホーム/ディスカバー）。静的アセットやAPIには発行しない。
export const config = {
  matcher: ["/", "/discover"],
};
