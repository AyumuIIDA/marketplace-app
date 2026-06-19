import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Seal } from "../ui/seal";
import { AccountMenu } from "./account-menu";
import { BottomNav } from "./bottom-nav";
import { LocaleToggle } from "./locale-toggle";
import { PrimaryNav } from "./primary-nav";

type MarketplaceShellProps = {
  activeSection?: "catalog" | "orders" | "me" | "sell" | "discover";
  authenticated?: boolean;
  children: ReactNode;
  humanLabel: string;
  humanVerified?: boolean;
  searchQuery?: string;
  userLabel: string;
};

export async function MarketplaceShell({
  activeSection,
  authenticated = false,
  children,
  humanLabel,
  humanVerified = false,
  searchQuery,
  userLabel,
}: MarketplaceShellProps) {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto grid min-h-16 max-w-[1320px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-2.5">
          <a className="flex shrink-0 items-center gap-2.5" href="/">
            <Seal size="sm" />
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-bold tracking-tight">{t("brand.name")}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                {t("brand.tagline")}
              </span>
            </span>
            <span className="sr-only sm:hidden">{t("brand.name")}</span>
          </a>

          <form
            action="/"
            className="flex min-w-0 overflow-hidden rounded-md border border-line-strong bg-surface focus-within:border-ink"
          >
            <label className="sr-only" htmlFor="marketplace-search">
              {t("search.label")}
            </label>
            <input
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
              defaultValue={searchQuery}
              id="marketplace-search"
              name="keyword"
              placeholder={t("search.placeholder")}
              type="search"
            />
            <button
              className="shrink-0 bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
              type="submit"
            >
              {t("search.submit")}
            </button>
          </form>

          <div className="flex items-center gap-1">
            <LocaleToggle />
            <AccountMenu authenticated={authenticated} humanLabel={humanLabel} humanVerified={humanVerified} userLabel={userLabel} />
          </div>
        </div>
        <div className="hidden border-t border-line md:block">
          <div className="mx-auto max-w-[1320px] px-4">
            <PrimaryNav activeSection={activeSection} />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1320px] px-4 py-6 pb-24 md:pb-6">{children}</section>
      <BottomNav />
    </main>
  );
}
