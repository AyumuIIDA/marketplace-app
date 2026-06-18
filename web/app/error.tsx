"use client";

import { useTranslations } from "next-intl";

// セグメントのエラー境界。server action やデータ取得の失敗をクラッシュさせず案内する。
// RootLayout の NextIntlClientProvider 内に描画されるため翻訳が使える。
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{t("body")}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
            onClick={reset}
            type="button"
          >
            {t("retry")}
          </button>
          <a
            className="inline-flex items-center justify-center rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
            href="/"
          >
            {t("home")}
          </a>
        </div>
      </div>
    </main>
  );
}
