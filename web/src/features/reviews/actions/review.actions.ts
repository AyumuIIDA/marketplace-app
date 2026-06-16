"use server";

import { redirect } from "next/navigation";
import type { IDKitResult } from "@worldcoin/idkit";

import { createReview, submitReview } from "../../../lib/api/reviews.api";
import { getWorldIdEnvironment } from "../../../lib/world/world-config";

export async function createReviewAction(formData: FormData): Promise<void> {
  const orderId = requiredFormValue(formData, "orderId");
  const review = await createReview({
    orderId,
    rating: Number(requiredFormValue(formData, "rating")),
    comment: requiredFormValue(formData, "comment"),
  });

  redirect(`/orders/${review.orderId}`);
}

export async function submitReviewWithWorldIdAction(reviewId: string, idKitResult: IDKitResult): Promise<void> {
  const review = await submitReview({
    reviewId,
    idKitResult,
    expectedEnvironment: getWorldIdEnvironment(),
  });
  redirect(`/orders/${review.orderId}`);
}

function requiredFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}
