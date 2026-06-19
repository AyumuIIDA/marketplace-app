"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "../../i18n/actions";
import { locales, type Locale } from "../../i18n/locale";

// ヘッダ常設の言語トグル。2ロケール前提で「押すと相手言語へ即切替」する1クリック動線。
// 現在ロケールを globe とコードで提示し、aria-label には切替先（相手言語）を自言語表記で出す。
export function LocaleToggle() {
  const active = useLocale() as Locale;
  const t = useTranslations("locale");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next = locales.find((locale) => locale !== active) ?? active;
  const switchToLabel = t("switchTo", { lang: t(next) });

  function switchLocale() {
    startTransition(async () => {
      await setLocale(next);
      // cookie 反映後に server component を再描画する。
      router.refresh();
    });
  }

  return (
    <button
      aria-label={switchToLabel}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-ink-soft outline-none transition-colors hover:bg-line/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-50"
      disabled={isPending}
      onClick={switchLocale}
      title={switchToLabel}
      type="button"
    >
      <GlobeIcon />
      <span className="font-mono text-xs font-medium uppercase tracking-wide">{active}</span>
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg
      aria-hidden
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </svg>
  );
}
