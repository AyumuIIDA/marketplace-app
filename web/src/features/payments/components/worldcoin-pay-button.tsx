"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { tokenToDecimals, Tokens } from "@worldcoin/minikit-js/commands";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { ActionButton } from "../../../components/ui/action-button";
import { confirmWorldcoinPayment } from "../../../lib/api/worldcoin-payment.client";
import { getWldJpyRate, getWorldcoinReceiverAddress } from "../../../lib/world/world-config";

type MiniKitPayClient = {
  isInWorldApp: () => boolean;
  pay: typeof MiniKit.pay;
};

type WorldcoinPayButtonProps = {
  disabled?: boolean;
  jpyPrice: number;
  listingId: string;
  miniKitClient?: MiniKitPayClient;
};

export function WorldcoinPayButton({
  disabled = false,
  jpyPrice,
  listingId,
  miniKitClient = MiniKit,
}: WorldcoinPayButtonProps) {
  const t = useTranslations("payment");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function payWithWorldcoin() {
    startTransition(async () => {
      const receiverAddress = getWorldcoinReceiverAddress();
      const wldJpyRate = getWldJpyRate();

      if (receiverAddress === undefined || receiverAddress.length === 0) {
        setMessage(t("noReceiver"));
        return;
      }

      if (wldJpyRate === undefined) {
        setMessage(t("noRate"));
        return;
      }

      if (!miniKitClient.isInWorldApp()) {
        setMessage(t("needWorldApp"));
        return;
      }

      try {
        const result = await miniKitClient.pay({
          reference: crypto.randomUUID().slice(0, 36),
          to: receiverAddress,
          tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(jpyPrice / wldJpyRate, Tokens.WLD).toString() }],
          description: `Listing ${listingId}`,
          fallback: () => ({ status: "web_fallback" }),
        });

        if (result.executedWith !== "minikit") {
          setMessage(t("needMinikit"));
          return;
        }

        const confirmation = await confirmWorldcoinPayment({ listingId, payload: result.data });

        if (confirmation.order !== undefined) {
          window.location.assign(`/orders/${confirmation.order.orderId}`);
          return;
        }

        setMessage(t("verified"));
      } catch {
        setMessage(t("failed"));
      }
    });
  }

  return (
    <div className="space-y-2">
      <ActionButton disabled={disabled || isPending} onClick={payWithWorldcoin} variant="primary">
        {isPending ? t("opening") : t("pay")}
      </ActionButton>
      {message !== undefined && <p className="text-xs leading-5 text-ink-soft">{message}</p>}
    </div>
  );
}
