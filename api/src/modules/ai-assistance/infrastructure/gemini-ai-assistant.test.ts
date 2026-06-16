import { describe, expect, it } from "vitest";
import type { GenerateContentParameters } from "@google/genai";

import { AppError } from "../../../shared/index.js";

import { GeminiAiAssistant } from "./gemini-ai-assistant.js";

describe("GeminiAiAssistant", () => {
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
});
