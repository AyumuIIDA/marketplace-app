// LLM未接続時の決定論fake。テスト可能性とデモ安定性のため、入力から規則的に生成する。
// provider確定後にLLM adapterへ差し替える（AiAssistant portは不変）。
const BASE_PRICE_BY_CATEGORY = {
    fashion_shoes: 8000,
    fashion: 6000,
    electronics: 15000,
    books: 1000,
    general: 5000,
};
const CONDITION_FACTOR = {
    new: 1.2,
    good: 1.0,
    fair: 0.8,
    poor: 0.6,
};
export class DeterministicAiAssistant {
    async suggestListingFields(input) {
        const hint = input.userHint?.trim() ?? "";
        return {
            title: hint.length > 0 ? hint.slice(0, 40) : "中古品",
            description: hint.length > 0
                ? `${hint}。状態は画像と説明から推定しています。`
                : "出品者からの説明はまだありません。",
            category: "general",
            condition: "good",
            confidenceNotes: ["状態とカテゴリは入力テキストから推定した暫定値です。"],
        };
    }
    async suggestPrice(input) {
        const base = BASE_PRICE_BY_CATEGORY[input.category] ?? BASE_PRICE_BY_CATEGORY.general;
        const conditionFactor = CONDITION_FACTOR[input.condition] ?? 1.0;
        const strategyFactor = input.priceStrategy === "slightly_below_market"
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
    async suggestReview(input) {
        const rating = input.ratingHint ?? 5;
        return {
            rating,
            comment: input.tone === "polite"
                ? "迅速かつ丁寧な取引をありがとうございました。"
                : "スムーズな取引で助かりました。",
        };
    }
}
