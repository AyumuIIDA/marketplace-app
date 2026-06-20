"use client";

import { useState } from "react";

import { combineClassNames } from "../../../components/ui/class-name";

type SaveStatus = { savedByMe: boolean };

type SaveButtonProps = {
  ariaLabel: string;
  initialSaved?: boolean;
  className?: string;
  // 保存トグルの server action（bind 済み）。
  toggleAction: (saved: boolean) => Promise<SaveStatus>;
};

/*
  保存（私的ウォッチリスト）トグル。公開シグナルのいいねと違い認証不要・件数非公開。
  ブックマークアイコンで「いいね（ハート）」と視覚的に区別する。楽観的更新→server action確定。
*/
export function SaveButton({ ariaLabel, className, initialSaved = false, toggleAction }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) {
      return;
    }
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const status = await toggleAction(next);
      setSaved(status.savedByMe);
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={saved}
      className={combineClassNames(
        "inline-flex items-center rounded-full bg-surface/90 p-2 shadow-sm ring-1 ring-line backdrop-blur transition-colors hover:bg-surface",
        saved ? "text-ink" : "text-ink-soft",
        className,
      )}
      disabled={pending}
      onClick={toggle}
      type="button"
    >
      <Bookmark className="size-4" filled={saved} />
    </button>
  );
}

function Bookmark({ className, filled }: { className?: string; filled: boolean }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  );
}
