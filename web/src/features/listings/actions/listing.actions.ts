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
    images: parseImagesField(formData.get("images")),
  });

  redirect(`/listings/${listing.listingId}`);
}

export async function suggestListingFieldsAction(input: {
  userHint?: string;
  imageUrls?: string[];
}): Promise<SuggestedListingFields> {
  const trimmed = input.userHint?.trim() ?? "";
  const imageUrls = input.imageUrls ?? [];

  if (trimmed.length === 0 && imageUrls.length === 0) {
    throw new Error("userHint or at least one image is required.");
  }

  return suggestListingFields({
    userHint: trimmed.length > 0 ? trimmed : undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  });
}

// hidden field の images(JSON) を安全にパースする。壊れた入力は無視して画像なし扱い。
function parseImagesField(
  value: FormDataEntryValue | null,
): { url: string; hash: string; sortOrder: number }[] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const images = parsed
      .filter(
        (item): item is { url: string; hash: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { url?: unknown }).url === "string" &&
          typeof (item as { hash?: unknown }).hash === "string",
      )
      .map((item, index) => ({ url: item.url, hash: item.hash, sortOrder: index }));

    return images.length > 0 ? images : undefined;
  } catch {
    return undefined;
  }
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
