import { describe, expect, it } from "vitest";

import { Listing } from "./listing.entity.js";
import {
  canSellerMutateListing,
  isPurchasableListing,
  isSearchableListing,
  requiresHumanSignatureForPublish,
  requiresHumanSignatureForUpdate,
} from "./listing.policy.js";

const now = new Date("2026-06-09T00:00:00.000Z");

function createDraftListing(): Listing {
  return Listing.createDraft({
    id: "listing_1",
    sellerId: "seller_1",
    title: "Sneakers",
    description: "Used a few times.",
    price: 7800,
    category: "fashion_shoes",
    condition: "good",
    now,
  });
}

describe("Listing policy", () => {
  it("should treat only published listings as purchasable and searchable", () => {
    const draft = createDraftListing();
    const published = createDraftListing();

    published.publish("signature_1", now);

    expect(isPurchasableListing(draft)).toBe(false);
    expect(isSearchableListing(draft)).toBe(false);
    expect(isPurchasableListing(published)).toBe(true);
    expect(isSearchableListing(published)).toBe(true);
  });

  it("should require human signature for draft publish and published update", () => {
    const draft = createDraftListing();
    const published = createDraftListing();

    published.publish("signature_1", now);

    expect(requiresHumanSignatureForPublish(draft)).toBe(true);
    expect(requiresHumanSignatureForPublish(published)).toBe(false);
    expect(requiresHumanSignatureForUpdate(draft)).toBe(false);
    expect(requiresHumanSignatureForUpdate(published)).toBe(true);
  });

  it("should allow only the seller to mutate active listings", () => {
    const draft = createDraftListing();
    const sold = createDraftListing();

    sold.publish("signature_1", now);
    sold.markSold(now);

    expect(canSellerMutateListing(draft, "seller_1")).toBe(true);
    expect(canSellerMutateListing(draft, "other_user")).toBe(false);
    expect(canSellerMutateListing(sold, "seller_1")).toBe(false);
  });
});
