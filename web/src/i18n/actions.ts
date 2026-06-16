"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";

// 言語切替: cookie に保存するだけ。次の描画で request.ts が拾う。
export async function setLocale(locale: Locale): Promise<void> {
  const store = await cookies();

  store.set(LOCALE_COOKIE, resolveLocale(locale), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
