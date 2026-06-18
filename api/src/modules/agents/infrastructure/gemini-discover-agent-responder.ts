import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";

import { AppError } from "../../../shared/index.js";
import type {
  BuildDiscoverAgentReplyInput,
  BuildDiscoverAgentReplyOutput,
  DiscoverAgentResponder,
} from "../application/index.js";

const discoverAgentReplySchema = z.object({
  assistantMessage: z.string().min(1),
});

type GeminiClient = {
  models: {
    generateContent(params: GenerateContentParameters): Promise<{
      text?: string;
    }>;
  };
};

type JsonSchema = {
  type: "object" | "string";
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

const discoverAgentReplyJsonSchema: JsonSchema = {
  type: "object",
  properties: {
    assistantMessage: { type: "string" },
  },
  required: ["assistantMessage"],
};

export type GeminiDiscoverAgentResponderDeps = {
  project: string;
  location: string;
  model: string;
  client?: GeminiClient;
};

export class GeminiDiscoverAgentResponder implements DiscoverAgentResponder {
  private readonly client: GeminiClient;

  constructor(private readonly deps: GeminiDiscoverAgentResponderDeps) {
    this.client =
      deps.client ??
      new GoogleGenAI({
        vertexai: true,
        project: deps.project,
        location: deps.location,
      });
  }

  async buildReply(input: BuildDiscoverAgentReplyInput): Promise<BuildDiscoverAgentReplyOutput> {
    const response = await this.client.models
      .generateContent({
        model: this.deps.model,
        contents: buildPrompt(input),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: discoverAgentReplyJsonSchema,
        },
      })
      .catch(() => {
        throw new AppError("AI_ASSIST_FAILED", "Gemini discover agent request failed.", 502, {
          provider: "gemini",
        });
      });

    const parsedJson = parseJson(readGeminiText(response.text));
    const parsed = discoverAgentReplySchema.safeParse(parsedJson);

    if (!parsed.success) {
      throw new AppError("AI_ASSIST_FAILED", "Gemini discover agent returned invalid structured output.", 502);
    }

    return parsed.data;
  }
}

function buildPrompt(input: BuildDiscoverAgentReplyInput): string {
  return [
    "あなたはフリマアプリの購入相談エージェントです。",
    "MCP tool search_listings の検索結果を読んで、ユーザーに自然な返答をしてください。",
    "検索結果にない事実は作らないでください。",
    "具体的な候補がある場合は、商品名・価格・署名有無を根拠として短く比較してください。",
    "条件に合う候補がない場合は、条件をどう広げるべきかを提案してください。",
    "返答はユーザーの言語に合わせてください。",
    "会話履歴(JSON):",
    JSON.stringify(input.messages.slice(-8)),
    "ユーザーの最新発話:",
    input.userMessage,
    "実行したMCP tool calls(JSON):",
    JSON.stringify(input.toolCalls),
    "MCP tool results(JSON):",
    JSON.stringify(input.toolResults),
    "検索結果(JSON):",
    JSON.stringify(
      input.listings.slice(0, 8).map((listing) => ({
        listingId: listing.listingId,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        category: listing.category,
        condition: listing.condition,
        signed: listing.signatureId !== undefined,
        status: listing.status,
      })),
    ),
  ].join("\n");
}

function readGeminiText(value: string | undefined): string {
  const text = value?.trim();

  if (text === undefined || text.length === 0) {
    throw new AppError("AI_ASSIST_FAILED", "Gemini discover agent returned no text output.", 502);
  }

  return text;
}

function parseJson(text: string): unknown {
  const jsonText = extractJsonText(text);

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new AppError("AI_ASSIST_FAILED", "Gemini discover agent returned non-JSON output.", 502);
  }
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  if (fenced?.[1] !== undefined) {
    return fenced[1].trim();
  }

  const firstObjectIndex = trimmed.indexOf("{");
  const lastObjectIndex = trimmed.lastIndexOf("}");

  if (firstObjectIndex !== -1 && lastObjectIndex > firstObjectIndex) {
    return trimmed.slice(firstObjectIndex, lastObjectIndex + 1);
  }

  return trimmed;
}
