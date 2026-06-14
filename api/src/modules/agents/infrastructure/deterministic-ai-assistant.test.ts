import { describe, expect, it } from "vitest";

import { DeterministicAiAssistant } from "./deterministic-ai-assistant.js";

describe("DeterministicAiAssistant", () => {
  const assistant = new DeterministicAiAssistant();

  it("derives listing fields from the user hint", async () => {
    const result = await assistant.suggestListingFields({ userHint: "去年買ったスニーカー" });

    expect(result.title).toBe("去年買ったスニーカー");
    expect(result.condition).toBe("good");
    expect(result.confidenceNotes.length).toBeGreaterThan(0);
  });

  it("prices by category, condition, and strategy deterministically", async () => {
    const market = await assistant.suggestPrice({
      title: "Earbuds",
      category: "electronics",
      condition: "good",
    });
    expect(market.suggestedPrice).toBe(15000);
    expect(market.currency).toBe("JPY");

    const discounted = await assistant.suggestPrice({
      title: "Earbuds",
      category: "electronics",
      condition: "good",
      priceStrategy: "slightly_below_market",
    });
    expect(discounted.suggestedPrice).toBe(13500);
  });

  it("drafts a review honoring the rating hint and tone", async () => {
    const result = await assistant.suggestReview({
      orderId: "order-1",
      ratingHint: 4,
      tone: "polite",
    });

    expect(result.rating).toBe(4);
    expect(result.comment).toContain("ありがとう");
  });

  it("drafts a message embedding the intent", async () => {
    const result = await assistant.suggestMessage({
      orderId: "order-1",
      intent: "発送日を確認したいです。",
      tone: "polite",
    });

    expect(result.message).toContain("発送日を確認したいです。");
  });

  it("compares listings and identifies the cheapest", async () => {
    const result = await assistant.compareListings({
      listings: [
        {
          listingId: "listing-1",
          title: "A",
          description: "",
          price: 5000,
          currency: "JPY",
          condition: "good",
          category: "general",
        },
        {
          listingId: "listing-2",
          title: "B",
          description: "",
          price: 3000,
          currency: "JPY",
          condition: "good",
          category: "general",
        },
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.summary).toContain("B");
    expect(result.items.find((i) => i.listingId === "listing-2")?.pros).toContain("価格が最も安い");
  });
});
