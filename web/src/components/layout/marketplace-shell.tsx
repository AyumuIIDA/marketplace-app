import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { ActionButton } from "../ui/action-button";
import { LocaleSwitcher } from "./locale-switcher";

type MarketplaceShellProps = {
  activeSection?: "catalog" | "orders" | "me";
  children: ReactNode;
  humanLabel: string;
  searchQuery?: string;
  userLabel: string;
};

export async function MarketplaceShell({
  children,
  humanLabel,
  searchQuery,
  userLabel,
}: MarketplaceShellProps) {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto grid min-h-16 max-w-[1320px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
          <a className="flex min-w-0 items-center gap-3" href="/">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200">
              <span className="size-4 rounded-full bg-[conic-gradient(from_160deg,#5b8def,#78d6a6,#ffd36e,#ee7d9c,#5b8def)]" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold leading-none">{t("brand.name")}</span>
              <span className="mt-1 hidden truncate text-xs text-neutral-500 sm:block">{humanLabel}</span>
            </span>
          </a>

          <form action="/" className="flex min-w-0 overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
            <label className="sr-only" htmlFor="marketplace-search">
              {t("search.label")}
            </label>
            <input
              className="min-w-0 flex-1 px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
              defaultValue={searchQuery}
              id="marketplace-search"
              name="keyword"
              placeholder={t("search.placeholder")}
              type="search"
            />
            <button
              className="shrink-0 bg-[#ffd36e] px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-[#f3c24f]"
              type="submit"
            >
              {t("search.submit")}
            </button>
          </form>

          <div className="flex items-center gap-2">
            <ActionButton className="hidden sm:inline-flex" href="/listings/new" variant="primary">
              {t("actions.createListing")}
            </ActionButton>
            <details className="group relative">
              <summary className="flex max-w-40 cursor-pointer list-none flex-col rounded-md px-3 py-1.5 text-left hover:bg-neutral-100">
                <span className="text-[11px] leading-4 text-neutral-500">{t("account.label")}</span>
                <span className="truncate text-sm font-semibold text-neutral-950">{userLabel}</span>
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
                <a className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/me">
                  {t("account.profile")}
                </a>
                <a className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/orders">
                  {t("account.orders")}
                </a>
                <a className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:hidden" href="/listings/new">
                  {t("actions.createListing")}
                </a>
                <a className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/api/auth/signin">
                  {t("actions.signIn")}
                </a>
              </div>
            </details>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1320px] px-4 py-6">{children}</section>
    </main>
  );
}
