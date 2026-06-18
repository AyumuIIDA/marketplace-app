"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { ActionButton } from "../ui/action-button";
import { Avatar } from "../ui/avatar";
import { LocaleSwitcher } from "./locale-switcher";

// 右上を整理する単一のアカウントメニュー。言語切替を両状態で内包し、
// サインアウト時も言語に到達できるようにする。<details> では得られない
// Esc/外側クリック/遷移クローズ・フォーカス管理のため client island にする。
type AccountMenuProps = {
  authenticated: boolean;
  userLabel: string;
  humanLabel: string;
};

const ITEM_CLASS =
  "block rounded-sm px-3 py-2 text-sm font-medium text-ink outline-none transition-colors hover:bg-paper focus-visible:bg-paper";

export function AccountMenu({ authenticated, humanLabel, userLabel }: AccountMenuProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ルート変更で閉じる。
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc・外側 pointerdown で閉じる。開いたら先頭項目へ、閉じたらトリガーへフォーカス。
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    panelRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-44 items-center gap-2 rounded-md px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-line/60 focus-visible:ring-2 focus-visible:ring-ink/30"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        {authenticated ? <Avatar alt="" className="size-7" seed={userLabel} /> : <UserIcon />}
        {authenticated ? (
          <span className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="truncate text-sm font-semibold text-ink">{userLabel}</span>
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              {humanLabel}
            </span>
          </span>
        ) : (
          <span className="hidden text-sm font-medium text-ink sm:inline">{t("account.label")}</span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          aria-label={t("account.label")}
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-md border border-line bg-surface p-1.5 shadow-md"
          ref={panelRef}
          role="menu"
        >
          {authenticated ? (
            <>
              <div className="px-3 pb-2 pt-1">
                <p className="truncate text-sm font-semibold text-ink">{userLabel}</p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                  {humanLabel}
                </p>
              </div>
              <div className="mb-1 border-t border-line" />
              <a className={ITEM_CLASS} href="/me" role="menuitem">
                {t("account.profile")}
              </a>
              <a className={ITEM_CLASS} href="/messages" role="menuitem">
                {t("nav.messages")}
              </a>
              <a className={ITEM_CLASS} href="/board" role="menuitem">
                {t("nav.board")}
              </a>
              <a className={`${ITEM_CLASS} md:hidden`} href="/sell" role="menuitem">
                {t("nav.sell")}
              </a>
              <div className="my-1 flex items-center justify-between gap-2 px-3 py-1">
                <span className="text-xs text-ink-soft">{t("locale.label")}</span>
                <LocaleSwitcher />
              </div>
              <div className="my-1 border-t border-line" />
              <a
                className="block rounded-sm px-3 py-2 text-sm font-medium text-seal-strong outline-none transition-colors hover:bg-seal-tint focus-visible:bg-seal-tint"
                href="/api/auth/signout"
                role="menuitem"
              >
                {t("account.signOut")}
              </a>
            </>
          ) : (
            <>
              <a className={ITEM_CLASS} href="/signin" role="menuitem">
                {t("actions.signIn")}
              </a>
              <div className="px-1 py-1">
                <ActionButton className="w-full" href="/signin?mode=signup" variant="primary">
                  {t("actions.signUp")}
                </ActionButton>
              </div>
              <div className="my-1 border-t border-line" />
              <div className="flex items-center justify-between gap-2 px-3 py-1">
                <span className="text-xs text-ink-soft">{t("locale.label")}</span>
                <LocaleSwitcher />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden
      className="size-5 shrink-0 text-ink-soft"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      className={`size-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
