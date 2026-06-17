import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";

import { AppError } from "../../../shared/index.js";
import { fetchInlineImages, type InlineImage } from "./image-content.js";
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

type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "integer";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

const suggestListingFieldsJsonSchema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    condition: { type: "string" },
    confidenceNotes: { type: "array", items: { type: "string" } },
  },
  required: ["title", "description", "category", "condition", "confidenceNotes"],
};

const suggestPriceJsonSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestedPrice: { type: "number" },
    currency: { type: "string" },
    reason: { type: "string" },
  },
  required: ["suggestedPrice", "currency", "reason"],
};

const suggestReviewJsonSchema: JsonSchema = {
  type: "object",
  properties: {
    rating: { type: "number" },
    comment: { type: "string" },
  },
  required: ["rating", "comment"],
};

const suggestMessageJsonSchema: JsonSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
};

const compareListingsJsonSchema: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          listingId: { type: "string" },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
        },
        required: ["listingId", "pros", "cons"],
      },
    },
  },
  required: ["summary", "items"],
};

type GeminiClient = {
  models: {
    generateContent(params: GenerateContentParameters): Promise<{
      text?: string;
    }>;
  };
};

export type GeminiAiAssistantDeps = {
  project: string;
  location: string;
  model: string;
  client?: GeminiClient;
};

export class GeminiAiAssistant implements AiAssistant {
  private readonly client: GeminiClient;

  constructor(private readonly deps: GeminiAiAssistantDeps) {
    this.client =
      deps.client ??
      new GoogleGenAI({
        vertexai: true,
        project: deps.project,
        location: deps.location,
      });
  }

  async suggestListingFields(
    input: SuggestListingFieldsInput,
  ): Promise<SuggestListingFieldsResult> {
    const images = await fetchInlineImages(input.imageUrls ?? []);

    return this.generateStructured(
      suggestListingFieldsSchema,
      suggestListingFieldsJsonSchema,
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
    return this.generateStructured(
      suggestPriceSchema,
      suggestPriceJsonSchema,
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
    return this.generateStructured(
      suggestReviewSchema,
      suggestReviewJsonSchema,
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
    return this.generateStructured(
      suggestMessageSchema,
      suggestMessageJsonSchema,
      [
        "あなたはフリマアプリの取引メッセージ草案AIです。取引相手へ送るメッセージを日本語で提案してください。",
        `注文ID: ${input.orderId}`,
        `意図: ${input.intent ?? "(なし)"}`,
        `トーン: ${input.tone ?? "丁寧"}`,
        "messageは相手に送れる完成した本文としてください。",
      ].join("\n"),
    );
  }

  async compareListings(input: CompareListingsInput): Promise<CompareListingsResult> {
    return this.generateStructured(
      compareListingsSchema,
      compareListingsJsonSchema,
      [
        "あなたはフリマアプリの商品比較AIです。以下の出品を比較し、購入判断を日本語で支援してください。",
        "各出品についてpros(長所)とcons(短所)を挙げ、全体のsummaryをまとめてください。",
        "対象出品(JSON):",
        JSON.stringify(input.listings),
        "itemsのlistingIdは入力のlistingIdと必ず一致させてください。",
      ].join("\n"),
    );
  }

  private async generateStructured<T>(
    schema: z.ZodType<T>,
    jsonSchema: JsonSchema,
    prompt: string,
    images: InlineImage[] = [],
  ): Promise<T> {
    let response;

    // 画像があればtextとinlineDataのpartsで送る。なければ従来どおりテキストのみ。
    const contents =
      images.length > 0
        ? [
            {
              role: "user",
              parts: [
                { text: prompt },
                ...images.map((image) => ({
                  inlineData: { mimeType: image.mimeType, data: image.base64 },
                })),
              ],
            },
          ]
        : prompt;

    try {
      response = await this.client.models.generateContent({
        model: this.deps.model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      });
    } catch {
      throw new AppError("AI_ASSIST_FAILED", "Gemini assistant request failed.", 502, {
        provider: "gemini",
      });
    }

    const text = readGeminiText(response.text);
    const parsedJson = parseJson(text);
    const parsed = schema.safeParse(parsedJson);

    if (!parsed.success) {
      throw new AppError("AI_ASSIST_FAILED", "Gemini assistant returned invalid structured output.", 502);
    }

    return parsed.data;
  }
}

function readGeminiText(value: string | undefined): string {
  const text = value?.trim();

  if (text === undefined || text.length === 0) {
    throw new AppError("AI_ASSIST_FAILED", "Gemini assistant returned no text output.", 502);
  }

  return text;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("AI_ASSIST_FAILED", "Gemini assistant returned non-JSON output.", 502);
  }
}
