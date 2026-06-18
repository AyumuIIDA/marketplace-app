import { afterEach, describe, expect, it, vi } from "vitest";
import type { GenerateContentParameters } from "@google/genai";

import { AppError } from "../../../shared/index.js";

import { GeminiAiAssistant } from "./gemini-ai-assistant.js";

describe("GeminiAiAssistant", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns structured output from the Gemini generateContent API", async () => {
    const requests: GenerateContentParameters[] = [];
    const assistant = new GeminiAiAssistant({
      project: "gcp-project",
      location: "global",
      model: "gemini-test-model",
      client: {
        models: {
          generateContent: async (params) => {
            requests.push(params);

            return {
              text: JSON.stringify({
                suggestedPrice: 7800,
                currency: "JPY",
                reason: "相場より少し低め。",
              }),
            };
          },
        },
      },
    });

    const result = await assistant.suggestPrice({
      title: "中古スニーカー",
      category: "fashion_shoes",
      condition: "good",
    });

    expect(result).toEqual({
      suggestedPrice: 7800,
      currency: "JPY",
      reason: "相場より少し低め。",
    });
    expect(requests[0]).toMatchObject({
      model: "gemini-test-model",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
        },
      },
    });
  });

  it("throws when Gemini returns invalid structured output", async () => {
    const assistant = new GeminiAiAssistant({
      project: "gcp-project",
      location: "global",
      model: "gemini-test-model",
      client: {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({ message: 123 }),
          }),
        },
      },
    });

    await expect(
      assistant.suggestMessage({ orderId: "order-1", intent: "発送予定を確認したい" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("validates structured output when Gemini wraps JSON with newlines and markdown fences", async () => {
    const assistant = new GeminiAiAssistant({
      project: "gcp-project",
      location: "global",
      model: "gemini-test-model",
      client: {
        models: {
          generateContent: async () => ({
            text: [
              "```json",
              "{",
              '  "message": "発送予定を確認したいです。\\nよろしくお願いします。"',
              "}",
              "```",
            ].join("\n"),
          }),
        },
      },
    });

    const result = await assistant.suggestMessage({
      orderId: "order-1",
      intent: "発送予定を確認したい",
    });

    expect(result).toEqual({
      message: "発送予定を確認したいです。\nよろしくお願いします。",
    });
  });

  it("rejects fenced Gemini JSON when the field types are invalid", async () => {
    const assistant = new GeminiAiAssistant({
      project: "gcp-project",
      location: "global",
      model: "gemini-test-model",
      client: {
        models: {
          generateContent: async () => ({
            text: ["```json", "{", '  "message": 123', "}", "```"].join("\n"),
          }),
        },
      },
    });

    await expect(
      assistant.suggestMessage({ orderId: "order-1", intent: "発送予定を確認したい" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws when Gemini request fails", async () => {
    const assistant = new GeminiAiAssistant({
      project: "gcp-project",
      location: "global",
      model: "gemini-test-model",
      client: {
        models: {
          generateContent: async () => {
            throw new Error("rate limited");
          },
        },
      },
    });

    await expect(
      assistant.suggestReview({ orderId: "order-1", ratingHint: 5 }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sends uploaded images as inlineData parts for listing field suggestions", async () => {
    const requests: GenerateContentParameters[] = [];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
    const assistant = new GeminiAiAssistant({
      project: "gcp-project",
      location: "global",
      model: "gemini-vision-test-model",
      client: {
        models: {
          generateContent: async (params) => {
            requests.push(params);

            return {
              text: JSON.stringify({
                title: "黒いスニーカー",
                description: "画像から黒いスニーカーと判断しました。",
                category: "fashion_shoes",
                condition: "good",
                confidenceNotes: ["画像を確認しました。"],
              }),
            };
          },
        },
      },
    });

    await assistant.suggestListingFields({
      userHint: "数回履いた靴",
      imageUrls: ["https://example.test/item.jpg"],
    });

    expect(requests[0]).toMatchObject({
      model: "gemini-vision-test-model",
      contents: [
        {
          role: "user",
          parts: [
            { text: expect.stringContaining("数回履いた靴") },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: "AQID",
              },
            },
          ],
        },
      ],
    });
  });
});
