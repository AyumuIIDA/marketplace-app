"use server";

import { redirect } from "next/navigation";
import type { IDKitResult } from "@worldcoin/idkit";

import {
  suggestListingFields,
  type SuggestedListingFields,
} from "../../../lib/api/ai-assistance.api";
import { createListing, publishListing, purchaseListing } from "../../../lib/api/listings.api";
import { getWorldIdEnvironment } from "../../../lib/world/world-config";

export async function createListingAction(formData: FormData): Promise<void> {
  const listing = await createListing({
    title: requiredFormValue(formData, "title"),
    description: requiredFormValue(formData, "description"),
    price: Number(requiredFormValue(formData, "price")),
    category: requiredFormValue(formData, "category"),
    condition: requiredFormValue(formData, "condition"),
  });

  redirect(`/listings/${listing.listingId}`);
}

export async function suggestListingFieldsAction(userHint: string): Promise<SuggestedListingFields> {
  const trimmed = userHint.trim();

  if (trimmed.length === 0) {
    throw new Error("userHint is required.");
  }

  return suggestListingFields({ userHint: trimmed });
}

export async function purchaseListingAction(formData: FormData): Promise<void> {
  const listingId = requiredFormValue(formData, "listingId");
  const output = await purchaseListing(listingId);

  if (output.status === "PAID") {
    redirect(`/orders/${output.order.orderId}`);
  }

  redirect(`/listings/${listingId}`);
}

export async function publishListingWithWorldIdAction(
  listingId: string,
  idKitResult: IDKitResult,
): Promise<void> {
  await publishListing({
    listingId,
    idKitResult,
    expectedEnvironment: getWorldIdEnvironment(),
  });
  redirect(`/listings/${listingId}`);
}

function requiredFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}
