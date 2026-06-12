// AIエージェント支援のoutbound port。実装はLLM adapter / 決定論fakeのいずれか。
// 単一Moduleで完結する生成系（出品/価格/評価の下書き）をAgents Application契約として公開する。

export type SuggestListingFieldsInput = {
  userHint?: string;
  imageIds?: string[];
};

export type SuggestListingFieldsResult = {
  title: string;
  description: string;
  category: string;
  condition: string;
  confidenceNotes: string[];
};

export type SuggestPriceInput = {
  title: string;
  category: string;
  condition: string;
  priceStrategy?: string;
};

export type SuggestPriceResult = {
  suggestedPrice: number;
  currency: string;
  reason: string;
};

export type SuggestReviewInput = {
  orderId: string;
  ratingHint?: number;
  tone?: string;
};

export type SuggestReviewResult = {
  rating: number;
  comment: string;
};

export interface AiAssistant {
  suggestListingFields(input: SuggestListingFieldsInput): Promise<SuggestListingFieldsResult>;
  suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceResult>;
  suggestReview(input: SuggestReviewInput): Promise<SuggestReviewResult>;
}
