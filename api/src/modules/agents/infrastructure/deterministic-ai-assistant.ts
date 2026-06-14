import type {
  AiAssistant,
  CompareListingsInput,
  CompareListingsResult,
  SuggestListingFieldsInput,
  SuggestListingFieldsResult,
  SuggestMessageInput,
  SuggestMessageResult,
  SuggestPriceInput,
  SuggestPriceResult,
  SuggestReviewInput,
  SuggestReviewResult,
} from "../application/index.js";

// LLM未接続時の決定論fake。テスト可能性とデモ安定性のため、入力から規則的に生成する。
// provider確定後にLLM adapterへ差し替える（AiAssistant portは不変）。
const BASE_PRICE_BY_CATEGORY: Record<string, number> = {
  fashion_shoes: 8000,
  fashion: 6000,
  electronics: 15000,
  books: 1000,
  general: 5000,
};

const CONDITION_FACTOR: Record<string, number> = {
  new: 1.2,
  good: 1.0,
  fair: 0.8,
  poor: 0.6,
};

export class DeterministicAiAssistant implements AiAssistant {
  async suggestListingFields(input: SuggestListingFieldsInput): Promise<SuggestListingFieldsResult> {
    const hint = input.userHint?.trim() ?? "";

    return {
      title: hint.length > 0 ? hint.slice(0, 40) : "中古品",
      description:
        hint.length > 0
          ? `${hint}。状態は画像と説明から推定しています。`
          : "出品者からの説明はまだありません。",
      category: "general",
      condition: "good",
      confidenceNotes: ["状態とカテゴリは入力テキストから推定した暫定値です。"],
    };
  }

  async suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceResult> {
    const base = BASE_PRICE_BY_CATEGORY[input.category] ?? BASE_PRICE_BY_CATEGORY.general;
    const conditionFactor = CONDITION_FACTOR[input.condition] ?? 1.0;
    const strategyFactor =
      input.priceStrategy === "slightly_below_market"
        ? 0.9
        : input.priceStrategy === "premium"
          ? 1.1
          : 1.0;
    const suggestedPrice = Math.round((base * conditionFactor * strategyFactor) / 100) * 100;

    return {
      suggestedPrice,
      currency: "JPY",
      reason: `${input.category}の基準価格${base}円に状態と価格戦略を反映しました。`,
    };
  }

  async suggestReview(input: SuggestReviewInput): Promise<SuggestReviewResult> {
    const rating = input.ratingHint ?? 5;

    return {
      rating,
      comment:
        input.tone === "polite"
          ? "迅速かつ丁寧な取引をありがとうございました。"
          : "スムーズな取引で助かりました。",
    };
  }

  async suggestMessage(input: SuggestMessageInput): Promise<SuggestMessageResult> {
    const intent = input.intent?.trim() ?? "";
    const body = intent.length > 0 ? intent : "取引について確認したいことがあります。";

    return {
      message:
        input.tone === "polite"
          ? `お世話になっております。${body}ご確認のほどよろしくお願いいたします。`
          : `${body}よろしくお願いします。`,
    };
  }

  async compareListings(input: CompareListingsInput): Promise<CompareListingsResult> {
    if (input.listings.length === 0) {
      return { summary: "比較対象の出品がありません。", items: [] };
    }

    const cheapest = input.listings.reduce((min, listing) =>
      listing.price < min.price ? listing : min,
    );

    return {
      summary: `${input.listings.length}件を比較しました。最安は「${cheapest.title}」(${cheapest.price}${cheapest.currency})です。`,
      items: input.listings.map((listing) => ({
        listingId: listing.listingId,
        pros: [
          listing.listingId === cheapest.listingId ? "価格が最も安い" : "選択肢のひとつ",
          `状態: ${listing.condition}`,
        ],
        cons: listing.listingId === cheapest.listingId ? [] : [`最安より高い(${listing.price}${listing.currency})`],
      })),
    };
  }
}
