"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { tokenToDecimals, Tokens } from "@worldcoin/minikit-js/commands";
import { useState, useTransition } from "react";

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
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function payWithWorldcoin() {
    startTransition(async () => {
      const receiverAddress = getWorldcoinReceiverAddress();
      const wldJpyRate = getWldJpyRate();

      if (receiverAddress === undefined || receiverAddress.length === 0) {
        setMessage("Worldcoin receiver address is not configured.");
        return;
      }

      if (wldJpyRate === undefined) {
        setMessage("WLD/JPY rate is not configured.");
        return;
      }

      if (!miniKitClient.isInWorldApp()) {
        setMessage("Open this marketplace inside World App to pay with Worldcoin.");
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
          setMessage("World App is required.");
          return;
        }

        const confirmation = await confirmWorldcoinPayment({ listingId, payload: result.data });

        if (confirmation.order !== undefined) {
          window.location.assign(`/orders/${confirmation.order.orderId}`);
          return;
        }

        setMessage("Worldcoin payment was verified by the backend.");
      } catch {
        setMessage("Worldcoin payment failed or was cancelled.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <ActionButton disabled={disabled || isPending} onClick={payWithWorldcoin} variant="primary">
        {isPending ? "Opening World App..." : "Pay with WLD"}
      </ActionButton>
      {message !== undefined && <p className="text-xs leading-5 text-neutral-500">{message}</p>}
    </div>
  );
}
