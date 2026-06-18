import type OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("sends uploaded images as input_image data URLs for listing field suggestions", async () => {
    const requests: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    const assistant = new OpenAiAiAssistant({
      client: {
        responses: {
          parse: async (params: unknown) => {
            requests.push(params);

            return {
              output_parsed: {
                title: "黒いスニーカー",
                description: "画像から黒いスニーカーと判断しました。",
                category: "fashion_shoes",
                condition: "good",
                confidenceNotes: ["画像を確認しました。"],
              },
            };
          },
        },
      } as unknown as OpenAI,
      model: "test-vision-model",
    });

    await assistant.suggestListingFields({
      userHint: "数回履いた靴",
      imageUrls: ["https://example.test/item.png"],
    });

    expect(requests[0]).toMatchObject({
      model: "test-vision-model",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: expect.stringContaining("数回履いた靴") },
            {
              type: "input_image",
              image_url: "data:image/png;base64,AQID",
              detail: "auto",
            },
          ],
        },
      ],
    });
  });
});
