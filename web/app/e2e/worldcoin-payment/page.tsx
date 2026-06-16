import { notFound } from "next/navigation";

import { WorldcoinPaymentHarness } from "./worldcoin-payment-harness";

export default function WorldcoinPaymentE2EPage() {
  if (process.env.E2E_TEST_MODE !== "1") {
    notFound();
  }

  return <WorldcoinPaymentHarness />;
}
