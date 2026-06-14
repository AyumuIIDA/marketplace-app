import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Human-backed Marketplace",
  description: "BFF shell for Human-backed Marketplace",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
