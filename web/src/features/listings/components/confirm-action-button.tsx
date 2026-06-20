"use client";

import { useEffect, useState } from "react";

import { ActionButton } from "../../../components/ui/action-button";

type Variant = "primary" | "secondary" | "accent";

type ConfirmActionButtonProps = {
  // 確定時に実行する server action（form action として渡す）。
  action: (formData: FormData) => Promise<void>;
  listingId: string;
  triggerLabel: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  triggerVariant?: Variant;
  confirmVariant?: Variant;
};

/*
  破壊的な操作（出品の取り消し等）に確認ダイアログを挟む client コンポーネント。
  トリガーを押すとモーダルを開き、確定で server action の form を submit する。
  背景クリック / Esc / キャンセルで閉じる。
*/
export function ConfirmActionButton({
  action,
  body,
  cancelLabel,
  confirmLabel,
  confirmVariant = "primary",
  listingId,
  title,
  triggerLabel,
  triggerVariant = "secondary",
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <ActionButton className="w-full" onClick={() => setOpen(true)} type="button" variant={triggerVariant}>
        {triggerLabel}
      </ActionButton>
      {open && (
        <div
          aria-labelledby="confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div
            className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-md"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-ink" id="confirm-title">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <ActionButton onClick={() => setOpen(false)} type="button" variant="secondary">
                {cancelLabel}
              </ActionButton>
              <form action={action}>
                <input name="listingId" type="hidden" value={listingId} />
                <ActionButton type="submit" variant={confirmVariant}>
                  {confirmLabel}
                </ActionButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
