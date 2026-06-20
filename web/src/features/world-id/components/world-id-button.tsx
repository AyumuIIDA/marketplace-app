"use client";

import { IDKitRequestWidget, type IDKitResult, orbLegacy } from "@worldcoin/idkit";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Seal } from "../../../components/ui/seal";
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

export function WorldIdButton({ action, label, onBeforeOpen, onVerified, signal }: WorldIdButtonProps) {
  const t = useTranslations("worldId");
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
        setMessage(t("prepareFailed"));
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
        setMessage(t("verified"));
      } catch {
        setMessage(t("failed"));
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
        <Seal size="xs" />
        {isPending ? t("verifying") : label}
      </button>
      {message !== undefined && <p className="text-xs leading-5 text-ink-soft">{message}</p>}
      {rpContext !== undefined && (
        <IDKitRequestWidget
          action={action}
          allow_legacy_proofs={true}
          app_id={getWorldAppId()}
          autoClose
          environment={getWorldIdEnvironment()}
          onOpenChange={setOpen}
          onSuccess={handleSuccess}
          open={open}
          preset={orbLegacy({ signal: preparedSignal ?? signal })}
          rp_context={rpContext}
        />
      )}
    </div>
  );
}
