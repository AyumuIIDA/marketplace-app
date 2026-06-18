import type { ReactNode } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { WorldMiniKitProvider } from "../src/components/world/world-minikit-provider";

import "./globals.css";

// データ/ID/AIラベル用のmono。latinサブセットのみで軽量。本文はsystem ja gothic（globals.css）。
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata = {
  title: "Human-backed Marketplace",
  description: "人間が署名する。AIが探す。検証済みの人だけが出品・評価できるフリマ。",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html className={plexMono.variable} lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WorldMiniKitProvider />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
