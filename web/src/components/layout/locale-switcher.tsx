"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "../../i18n/actions";
import { locales, type Locale } from "../../i18n/locale";

export function LocaleSwitcher() {
  const active = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSelect(locale: Locale) {
    startTransition(async () => {
      await setLocale(locale);
      // cookie 反映後に server component を再描画する。
      router.refresh();
    });
  }

  return (
    <div
      aria-label={t("label")}
      className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-xs shadow-sm"
    >
      {locales.map((locale) => (
        <button
          className={
            locale === active
              ? "rounded-full bg-ink px-3 py-1 font-medium text-paper"
              : "rounded-full px-3 py-1 font-medium text-ink-soft hover:text-ink"
          }
          disabled={isPending}
          key={locale}
          onClick={() => {
            onSelect(locale);
          }}
          type="button"
        >
          {t(locale)}
        </button>
      ))}
    </div>
  );
}
