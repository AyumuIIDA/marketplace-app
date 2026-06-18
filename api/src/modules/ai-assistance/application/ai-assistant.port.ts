// AIエージェント支援のoutbound port。実装はLLM adapter / 決定論fakeのいずれか。
// 単一Moduleで完結する生成系（出品/価格/評価の下書き）をAgents Application契約として公開する。

export type SuggestListingFieldsInput = {
  userHint?: string;
  // 商品画像のAPI到達可能URL（POST /listings/images の戻り値）。LLM adapterが取得しマルチモーダル入力にする。
  imageUrls: string[];
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

export type SuggestMessageInput = {
  orderId: string;
  intent?: string;
  tone?: string;
};

export type SuggestMessageResult = {
  message: string;
};

// 比較対象の出品要約。AIに渡す最小情報のみ（取得はworkflow側で行う）。
export type ComparableListing = {
  listingId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  category: string;
};

export type CompareListingsInput = {
  listings: ComparableListing[];
};

export type CompareListingsResult = {
  summary: string;
  items: Array<{
    listingId: string;
    pros: string[];
    cons: string[];
  }>;
};

export interface AiAssistant {
  suggestListingFields(input: SuggestListingFieldsInput): Promise<SuggestListingFieldsResult>;
  suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceResult>;
  suggestReview(input: SuggestReviewInput): Promise<SuggestReviewResult>;
  suggestMessage(input: SuggestMessageInput): Promise<SuggestMessageResult>;
  compareListings(input: CompareListingsInput): Promise<CompareListingsResult>;
}
