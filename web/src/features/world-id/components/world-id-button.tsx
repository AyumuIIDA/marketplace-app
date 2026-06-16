"use client";

import { IDKitRequestWidget, type IDKitResult, proofOfHuman } from "@worldcoin/idkit";
import { useState, useTransition } from "react";

import { ActionButton } from "../../../components/ui/action-button";
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
      <ActionButton disabled={isPending} onClick={openWidget} variant="primary">
        {isPending ? "Verifying..." : label}
      </ActionButton>
      {message !== undefined && <p className="text-xs leading-5 text-neutral-500">{message}</p>}
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
