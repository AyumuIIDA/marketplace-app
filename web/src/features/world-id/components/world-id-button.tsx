"use client";

import { IDKitRequestWidget, type IDKitResult, proofOfHuman } from "@worldcoin/idkit";
import { useState, useTransition } from "react";

import { createWorldIdRpContext, type WorldIdRpContext } from "../../../lib/api/world-id-context.client";
import { getWorldAppId, getWorldIdEnvironment, type WorldIdAction } from "../../../lib/world/world-config";
import { linkWorldIdAction } from "../actions/world-id.actions";

type WorldIdButtonProps = {
  action: WorldIdAction;
  label: string;
  onBeforeOpen?: () => Promise<string | undefined>;
  onVerified?: (result: IDKitResult) => Promise<void>;
  signal?: string;
};

// World ID 公式準拠の人間性検証マーク（オーブ/グローブ）。「Verify with World ID」ブランドボタンに使用。
function WorldMark() {
  return (
    <svg aria-hidden className="size-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3c-3.2 2.6-3.2 15.4 0 18M12 3c3.2 2.6 3.2 15.4 0 18M3.4 9.5h17.2M3.4 14.5h17.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function WorldIdButton({ action, label, onBeforeOpen, onVerified, signal }: WorldIdButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [preparedSignal, setPreparedSignal] = useState<string | undefined>();
  const [rpContext, setRpContext] = useState<WorldIdRpContext | undefined>();
  const [isPending, startTransition] = useTransition();

  function openWidget() {
    startTransition(async () => {
      try {
        const nextSignal = await onBeforeOpen?.();
        setPreparedSignal(nextSignal);
        setRpContext(await createWorldIdRpContext(action));
        setOpen(true);
      } catch {
        setMessage("World ID request could not be prepared.");
      }
    });
  }

  function handleSuccess(result: IDKitResult) {
    startTransition(async () => {
      try {
        if (onVerified !== undefined) {
          await onVerified(result);
        } else {
          await linkWorldIdAction(result);
        }
        setMessage("World ID verification completed.");
      } catch {
        setMessage("World ID verification failed.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191c20] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60"
        disabled={isPending}
        onClick={openWidget}
        type="button"
      >
        <WorldMark />
        {isPending ? "Verifying…" : label}
      </button>
      {message !== undefined && <p className="text-xs leading-5 text-ink-soft">{message}</p>}
      {rpContext !== undefined && (
        <IDKitRequestWidget
          action={action}
          allow_legacy_proofs={false}
          app_id={getWorldAppId()}
          autoClose
          environment={getWorldIdEnvironment()}
          onOpenChange={setOpen}
          onSuccess={handleSuccess}
          open={open}
          preset={proofOfHuman({ signal: preparedSignal ?? signal })}
          rp_context={rpContext}
        />
      )}
    </div>
  );
}
