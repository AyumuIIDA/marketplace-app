import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { ActionButton } from "../ui/action-button";
import { Seal } from "../ui/seal";
import { LocaleSwitcher } from "./locale-switcher";

type MarketplaceShellProps = {
  // 互換のため残す（現状ナビのハイライトには未使用）。
  activeSection?: "catalog" | "orders" | "me";
  authenticated?: boolean;
  children: ReactNode;
  humanLabel: string;
  searchQuery?: string;
  userLabel: string;
};

export async function MarketplaceShell({
  authenticated = false,
  children,
  humanLabel,
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

          <div className="flex items-center gap-2">
            <a
              className="hidden items-center gap-1.5 rounded-full border border-seal/30 bg-seal-tint px-3 py-1.5 text-sm font-semibold text-seal-strong transition-colors hover:bg-seal/10 sm:inline-flex"
              href="/discover"
            >
              <span className="grid size-4 place-items-center rounded-full border border-seal text-[9px] font-bold leading-none text-seal">
                人
              </span>
              {t("nav.discover")}
            </a>
            <ActionButton className="hidden md:inline-flex" href="/listings/new" variant="secondary">
              {t("nav.sell")}
            </ActionButton>

            {authenticated ? (
              <details className="group relative">
                <summary className="flex max-w-44 cursor-pointer list-none items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-line/60">
                  <span className="flex min-w-0 flex-col text-left leading-tight">
                    <span className="truncate text-sm font-semibold text-ink">{userLabel}</span>
                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      {humanLabel}
                    </span>
                  </span>
                </summary>
                <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-md border border-line bg-surface p-1.5 shadow-md">
                  <a className="block rounded-sm px-3 py-2 text-sm font-medium text-ink hover:bg-paper" href="/me">
                    {t("account.profile")}
                  </a>
                  <a className="block rounded-sm px-3 py-2 text-sm font-medium text-ink hover:bg-paper" href="/orders">
                    {t("account.orders")}
                  </a>
                  <a className="block rounded-sm px-3 py-2 text-sm font-medium text-ink hover:bg-paper md:hidden" href="/listings/new">
                    {t("nav.sell")}
                  </a>
                  <div className="my-1 border-t border-line" />
                  <a
                    className="block rounded-sm px-3 py-2 text-sm font-medium text-seal-strong hover:bg-seal-tint"
                    href="/api/auth/signout"
                  >
                    {t("account.signOut")}
                  </a>
                </div>
              </details>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  className="hidden text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:inline"
                  href="/signin"
                >
                  {t("actions.signIn")}
                </a>
                <ActionButton href="/signin?mode=signup" variant="primary">
                  {t("actions.signUp")}
                </ActionButton>
              </div>
            )}

            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1320px] px-4 py-6">{children}</section>
    </main>
  );
}
