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
});
