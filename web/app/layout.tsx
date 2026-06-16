import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { WorldMiniKitProvider } from "../src/components/world/world-minikit-provider";

import "./globals.css";

export const metadata = {
  title: "Human-backed Marketplace",
  description: "BFF shell for Human-backed Marketplace",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WorldMiniKitProvider />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
