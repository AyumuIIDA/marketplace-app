import type OpenAI from "openai";
import { describe, expect, it } from "vitest";

import { AppError } from "../../../shared/index.js";

import { OpenAiAiAssistant } from "./openai-ai-assistant.js";

// output_parsed を返す最小のOpenAI client fake。bodyは無視する。
function fakeClient(outputParsed: unknown): OpenAI {
  return {
    responses: {
      parse: async () => ({ output_parsed: outputParsed }),
    },
  } as unknown as OpenAI;
}

describe("OpenAiAiAssistant", () => {
  it("returns the structured output parsed from the Responses API", async () => {
    const assistant = new OpenAiAiAssistant({
      client: fakeClient({
        suggestedPrice: 7800,
        currency: "JPY",
        reason: "相場より少し低め。",
      }),
      model: "test-model",
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
  });

  it("throws when the model returns no structured output", async () => {
    const assistant = new OpenAiAiAssistant({
      client: fakeClient(null),
      model: "test-model",
    });

    await expect(
      assistant.suggestReview({ orderId: "order-1", ratingHint: 5 }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
