"use client";

import type { PayResult } from "@worldcoin/minikit-js/commands";

import { WorldcoinPayButton } from "../../../src/features/payments/components/worldcoin-pay-button";

const miniKitClient = {
  isInWorldApp: () => true,
  pay: async () => ({
    executedWith: "minikit" as const,
    data: {
      transactionId: "tx_e2e_worldcoin_payment",
    } as PayResult,
  }),
};

export function WorldcoinPaymentHarness() {
  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Worldcoin payment E2E</h1>
      <WorldcoinPayButton jpyPrice={900} listingId="listing_e2e_001" miniKitClient={miniKitClient} />
    </main>
  );
}
