"use client";

import type { IDKitResult } from "@worldcoin/idkit";
import { useState } from "react";

import type { Review } from "../../../lib/api/reviews.api";
import { WorldIdButton } from "../../world-id/components/world-id-button";
import { computeReviewSignal } from "../../world-id/signature-payload";
import { submitReviewWithWorldIdAction } from "../actions/review.actions";

type SubmitReviewButtonProps = {
  review: Review;
};

export function SubmitReviewButton({ review }: SubmitReviewButtonProps) {
  const [signal, setSignal] = useState<string | undefined>();

  async function handleVerified(result: IDKitResult): Promise<void> {
    await submitReviewWithWorldIdAction(review.reviewId, result);
  }

  async function prepareSignal(): Promise<string> {
    const nextSignal = await computeReviewSignal(review);
    setSignal(nextSignal);

    return nextSignal;
  }

  return (
    <WorldIdButton
      action="review-submit"
      label="Submit with World ID"
      onBeforeOpen={prepareSignal}
      onVerified={handleVerified}
      signal={signal}
    />
  );
}
