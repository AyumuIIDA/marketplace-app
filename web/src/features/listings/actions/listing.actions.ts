"use server";

import { redirect } from "next/navigation";

import {
  suggestListingFields,
  type SuggestedListingFields,
} from "../../../lib/api/ai-assistance.api";
import {
  createListing,
  publishUnsignedListing,
  purchaseListing,
  relistListing,
  withdrawListing,
} from "../../../lib/api/listings.api";

export async function createListingAction(formData: FormData): Promise<void> {
  const listing = await createListing({
    title: requiredFormValue(formData, "title"),
    description: requiredFormValue(formData, "description"),
    price: Number(requiredFormValue(formData, "price")),
    category: requiredFormValue(formData, "category"),
    condition: requiredFormValue(formData, "condition"),
    images: parseImagesField(formData.get("images")),
  });

  // 「作成して公開」= login のみで即公開（World ID不要）。未指定なら下書きのまま。
  if (formData.get("publish") === "true") {
    await publishUnsignedListing(listing.listingId);
  }

  redirect(`/listings/${listing.listingId}`);
}

// World ID署名なしの公開（出品者がログインのみで公開）。
export async function publishListingAction(formData: FormData): Promise<void> {
  const listingId = requiredFormValue(formData, "listingId");
  await publishUnsignedListing(listingId);
  redirect(`/listings/${listingId}`);
}

// 出品の取り消し（HIDDEN化）。取り消し後はマイページへ戻す（出品一覧から外れる）。
export async function withdrawListingAction(formData: FormData): Promise<void> {
  const listingId = requiredFormValue(formData, "listingId");
  await withdrawListing(listingId);
  redirect("/me");
}

// 再出品（HIDDEN→PUBLISHED）。再公開後は出品ページへ戻す。
export async function relistListingAction(formData: FormData): Promise<void> {
  const listingId = requiredFormValue(formData, "listingId");
  await relistListing(listingId);
  redirect(`/listings/${listingId}`);
}

export async function suggestListingFieldsAction(input: {
  userHint?: string;
  imageUrls?: string[];
}): Promise<SuggestedListingFields> {
  const trimmed = input.userHint?.trim() ?? "";
  const imageUrls = input.imageUrls ?? [];

  if (imageUrls.length === 0) {
    throw new Error("At least one image is required.");
  }

  return suggestListingFields({
    userHint: trimmed.length > 0 ? trimmed : undefined,
    imageUrls,
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

  // 購入完了は一覧(ホーム)に戻り、トーストで通知する（注文追跡ページは未実装のため遷移しない）。
  if (output.status === "PAID") {
    redirect(`/?purchased=1`);
  }

  redirect(`/listings/${listingId}`);
}

function requiredFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}
