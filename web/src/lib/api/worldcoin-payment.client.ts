import type { PayResult } from "@worldcoin/minikit-js/commands";

export type WorldcoinPaymentConfirmation = {
  order?: {
    orderId: string;
  };
  transaction: unknown;
};

export async function confirmWorldcoinPayment(input: {
  listingId: string;
  payload: PayResult;
}): Promise<WorldcoinPaymentConfirmation> {
  const response = await fetch("/api/worldcoin/payment/confirm", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Worldcoin payment could not be verified.");
  }

  return (await response.json()) as WorldcoinPaymentConfirmation;
}
