// 対応ロケールと既定値。locale は cookie に永続化する（api/ には保存しない方針）。
export const locales = ["en", "ja"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

export const LOCALE_COOKIE = "LOCALE";

// 未知/未設定の値は既定ロケールへ丸める。
export function resolveLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
