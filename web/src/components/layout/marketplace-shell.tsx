import type { ReactNode } from "react";

import { GlassPanel } from "../ui/glass-panel";

type MarketplaceShellProps = {
  children: ReactNode;
  humanLabel: string;
  userLabel: string;
};

const navigationItems = [
  { href: "#", label: "Portal", active: true },
  { href: "#", label: "Catalog", active: false },
  { href: "#", label: "Orders", active: false },
] as const;

const controlItems = [
  { href: "/api/auth/signin", label: "Sign in", mark: "in", meta: "Google / GitHub / email", primary: true },
  { label: "Link World ID", mark: "id" },
  { label: "Create listing", mark: "+" },
  { label: "Orders", mark: "or", meta: "Purchases and sales" },
  { label: "Messages", mark: "ms", meta: "Order conversations" },
  { label: "Reviews", mark: "rv", meta: "Submit verified feedback" },
] as const;

export function MarketplaceShell({ children, humanLabel, userLabel }: MarketplaceShellProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f9fb] text-neutral-950">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(154,196,255,0.55),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(241,198,255,0.48),transparent_30%),radial-gradient(circle_at_48%_45%,rgba(255,229,181,0.52),transparent_38%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 to-transparent" />

      <header className="sticky top-0 z-30 border-b border-white/50 bg-[#f8f9fb]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5">
          <a className="flex items-center gap-3" href="#">
            <span className="grid size-9 place-items-center rounded-full bg-white/82 shadow-sm ring-1 ring-black/6 backdrop-blur">
              <span className="size-4 rounded-full bg-[conic-gradient(from_160deg,#5b8def,#78d6a6,#ffd36e,#ee7d9c,#5b8def)]" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">Human-backed</span>
              <span className="mt-1 hidden text-xs text-neutral-500 sm:block">Marketplace portal</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 rounded-full bg-white/64 p-1 text-sm text-neutral-600 shadow-sm ring-1 ring-black/6 backdrop-blur-xl md:flex">
            {navigationItems.map((item) => (
              <a
                className={
                  item.active
                    ? "rounded-full bg-neutral-950 px-4 py-2 font-medium text-white"
                    : "rounded-full px-4 py-2 font-medium hover:bg-white hover:text-neutral-950"
                }
                href={item.href}
                key={item.label}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1500px] gap-6 px-5 pb-10 pt-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1">
          <GlassPanel className="p-3 lg:sticky lg:top-20">
            <div className="px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">Controls</p>
              <p className="mt-2 text-sm font-semibold text-neutral-950">{userLabel}</p>
            </div>

            <div className="space-y-1">
              {controlItems.map((item) => (
                <ControlButton
                  href={"href" in item ? item.href : undefined}
                  key={item.label}
                  label={item.label}
                  mark={item.mark}
                  meta={"meta" in item ? item.meta : humanLabel}
                  primary={"primary" in item ? item.primary : false}
                />
              ))}
            </div>

            <div className="px-3 pb-3 pt-4">
              <p className="text-xs leading-5 text-neutral-400">
                Browse freely. Sign in when you want to buy, sell, or message.
              </p>
            </div>
          </GlassPanel>
        </aside>

        <section className="order-1 min-w-0 lg:order-2">{children}</section>
      </div>
    </main>
  );
}

function ControlButton({
  href,
  label,
  mark,
  meta,
  primary = false,
}: {
  href?: string;
  label: string;
  mark: string;
  meta: string;
  primary?: boolean;
}) {
  const className = `flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-left transition ${
    primary
      ? "bg-neutral-950 text-white shadow-sm"
      : "text-neutral-700 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
  }`;
  const content = (
    <>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          primary ? "bg-white/14 text-white" : "bg-neutral-100 text-neutral-500"
        }`}
      >
        {mark}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`mt-0.5 block truncate text-xs ${primary ? "text-white/58" : "text-neutral-400"}`}>
          {meta}
        </span>
      </span>
    </>
  );

  if (href !== undefined) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} type="button">
      {content}
    </button>
  );
}
