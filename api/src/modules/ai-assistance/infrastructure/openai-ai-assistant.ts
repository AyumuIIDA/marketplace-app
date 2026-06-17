import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AppError } from "../../../shared/index.js";
import { fetchInlineImages, toDataUrl, type InlineImage } from "./image-content.js";
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

// LLM応答はResponses APIのstructured output(zodTextFormat)で受け、portのresult型へ確定する。
// 各schemaはport result型と一致させ、adapter境界で検証する。
const suggestListingFieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  condition: z.string(),
  confidenceNotes: z.array(z.string()),
});

const suggestPriceSchema = z.object({
  suggestedPrice: z.number(),
  currency: z.string(),
  reason: z.string(),
});

const suggestReviewSchema = z.object({
  rating: z.number(),
  comment: z.string(),
});

const suggestMessageSchema = z.object({
  message: z.string(),
});

const compareListingsSchema = z.object({
  summary: z.string(),
  items: z.array(
    z.object({
      listingId: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    }),
  ),
});

// adapter境界の二重定義ガード。各zod schemaのinfer型がport result型と双方向一致することを
// 型レベルで強制する。片方向でもズレるとコンパイルエラーになり、OpenAI応答とportの構造不一致
// （実行時502 = output_parsedが期待形でない）を未然に防ぐ。
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _schemaContracts: [
  Exact<z.infer<typeof suggestListingFieldsSchema>, SuggestListingFieldsResult>,
  Exact<z.infer<typeof suggestPriceSchema>, SuggestPriceResult>,
  Exact<z.infer<typeof suggestReviewSchema>, SuggestReviewResult>,
  Exact<z.infer<typeof suggestMessageSchema>, SuggestMessageResult>,
  Exact<z.infer<typeof compareListingsSchema>, CompareListingsResult>,
] = [true, true, true, true, true];
void _schemaContracts;

export type OpenAiAiAssistantDeps = {
  client: OpenAI;
  model: string;
};

export class OpenAiAiAssistant implements AiAssistant {
  constructor(private readonly deps: OpenAiAiAssistantDeps) {}

  async suggestListingFields(
    input: SuggestListingFieldsInput,
  ): Promise<SuggestListingFieldsResult> {
    const images = await fetchInlineImages(input.imageUrls ?? []);

    return this.parse(
      suggestListingFieldsSchema,
      "suggest_listing_fields",
      [
        "あなたはフリマアプリの出品支援AIです。以下の情報から出品項目を日本語で提案してください。",
        `ヒント: ${input.userHint ?? "(なし)"}`,
        images.length > 0
          ? "添付された商品画像を読み取り、見た目・状態・カテゴリを反映してください。"
          : "画像はありません。テキストのヒントから推定してください。",
        "confidenceNotesには推定の根拠や不確実な点を記載してください。",
      ].join("\n"),
      images,
    );
  }

  async suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceResult> {
    return this.parse(
      suggestPriceSchema,
      "suggest_price",
      [
        "あなたはフリマアプリの価格提案AIです。以下の商品の希望出品価格を理由付きで提案してください。",
        `タイトル: ${input.title}`,
        `カテゴリ: ${input.category}`,
        `状態: ${input.condition}`,
        `価格戦略: ${input.priceStrategy ?? "標準"}`,
        'suggestedPriceは日本円(JPY)の整数、currencyは"JPY"としてください。',
      ].join("\n"),
    );
  }

  async suggestReview(input: SuggestReviewInput): Promise<SuggestReviewResult> {
    return this.parse(
      suggestReviewSchema,
      "suggest_review",
      [
        "あなたはフリマアプリの評価文ドラフトAIです。取引の評価文を日本語で提案してください。",
        `注文ID: ${input.orderId}`,
        `評価の目安: ${input.ratingHint ?? "(指定なし)"}`,
        `トーン: ${input.tone ?? "中立"}`,
        "ratingは1〜5の整数としてください。",
      ].join("\n"),
    );
  }

  async suggestMessage(input: SuggestMessageInput): Promise<SuggestMessageResult> {
    return this.parse(
      suggestMessageSchema,
      "suggest_message",
      [
        "あなたはフリマアプリの取引メッセージ草案AIです。取引相手へ送るメッセージを日本語で提案してください。",
        `注文ID: ${input.orderId}`,
        `意図: ${input.intent ?? "(指定なし)"}`,
        `トーン: ${input.tone ?? "丁寧"}`,
        "messageは相手に送れる完成した本文としてください。",
      ].join("\n"),
    );
  }

  async compareListings(input: CompareListingsInput): Promise<CompareListingsResult> {
    return this.parse(
      compareListingsSchema,
      "compare_listings",
      [
        "あなたはフリマアプリの商品比較AIです。以下の出品を比較し、購入判断を日本語で支援してください。",
        "各出品についてpros(長所)とcons(短所)を挙げ、全体のsummaryをまとめてください。",
        "対象出品(JSON):",
        JSON.stringify(input.listings),
        "itemsのlistingIdは入力のlistingIdと必ず一致させてください。",
      ].join("\n"),
    );
  }

  private async parse<T>(
    schema: z.ZodType<T>,
    name: string,
    prompt: string,
    images: InlineImage[] = [],
  ): Promise<T> {
    // 画像があればinput_text + input_imageのcontent配列で送る。なければテキストのみ。
    const input =
      images.length > 0
        ? [
            {
              role: "user" as const,
              content: [
                { type: "input_text" as const, text: prompt },
                ...images.map((image) => ({
                  type: "input_image" as const,
                  image_url: toDataUrl(image),
                  detail: "auto" as const,
                })),
              ],
            },
          ]
        : prompt;

    const response = await this.deps.client.responses.parse({
      model: this.deps.model,
      input,
      text: { format: zodTextFormat(schema, name) },
    });

    if (response.output_parsed === null) {
      throw new AppError("AI_ASSIST_FAILED", "AI assistant returned no structured output.", 502);
    }

    return response.output_parsed;
  }
}
