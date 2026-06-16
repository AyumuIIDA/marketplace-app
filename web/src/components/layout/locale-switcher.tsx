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
      className="flex items-center gap-1 rounded-full bg-white/64 p-1 text-xs shadow-sm ring-1 ring-black/6 backdrop-blur-xl"
    >
      {locales.map((locale) => (
        <button
          className={
            locale === active
              ? "rounded-full bg-neutral-950 px-3 py-1 font-medium text-white"
              : "rounded-full px-3 py-1 font-medium text-neutral-600 hover:text-neutral-950"
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
