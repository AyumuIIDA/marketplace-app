import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";

import { AppError } from "../../../shared/index.js";
import type {
  DiscoverAgentPlanner,
  DiscoverAgentToolPlan,
  PlanDiscoverAgentToolInput,
} from "../application/index.js";

const toolPlanSchema = z.object({
  toolName: z.enum(["search_listings", "get_listing", "compare_listings", "suggest_price"]),
  arguments: z.record(z.string(), z.unknown()),
});

type GeminiClient = {
  models: {
    generateContent(params: GenerateContentParameters): Promise<{
      text?: string;
    }>;
  };
};

export type GeminiDiscoverAgentPlannerDeps = {
  project: string;
  location: string;
  model: string;
  client?: GeminiClient;
};

export class GeminiDiscoverAgentPlanner implements DiscoverAgentPlanner {
  private readonly client: GeminiClient;

  constructor(private readonly deps: GeminiDiscoverAgentPlannerDeps) {
    this.client =
      deps.client ??
      new GoogleGenAI({
        vertexai: true,
        project: deps.project,
        location: deps.location,
      });
  }

  async planTool(input: PlanDiscoverAgentToolInput): Promise<DiscoverAgentToolPlan> {
    const response = await this.client.models
      .generateContent({
        model: this.deps.model,
        contents: buildPlannerPrompt(input),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              toolName: { type: "string" },
              arguments: { type: "object" },
            },
            required: ["toolName", "arguments"],
          },
        },
      })
      .catch(() => {
        throw new AppError("AI_ASSIST_FAILED", "Gemini discover planner request failed.", 502, {
          provider: "gemini",
        });
      });

    const parsedJson = parseJson(readText(response.text));
    const parsed = toolPlanSchema.safeParse(parsedJson);

    if (!parsed.success) {
      throw new AppError("AI_ASSIST_FAILED", "Gemini discover planner returned invalid tool plan.", 502);
    }

    return parsed.data;
  }
}

function buildPlannerPrompt(input: PlanDiscoverAgentToolInput): string {
  return [
    "You are selecting exactly one MCP tool for a marketplace shopping assistant.",
    "Return only JSON with toolName and arguments.",
    "Allowed tools:",
    "- search_listings: find listings. args: keyword?, category?, minPrice?, maxPrice?, condition?, mine?, limit?",
    "- get_listing: inspect one listing. args: listingId",
    "- compare_listings: compare 2-5 known listing IDs. args: listingIds",
    "- suggest_price: suggest a listing price. args: title, category, condition, priceStrategy?",
    "Choose search_listings for ordinary shopping/search requests.",
    "Choose get_listing only when a specific listing ID is present and details are requested.",
    "Choose compare_listings only when at least two listing IDs are present and comparison is requested.",
    "Choose suggest_price only when the user asks what price to set for an item.",
    "Conversation history JSON:",
    JSON.stringify(input.messages.slice(-8)),
    "Latest user message:",
    input.userMessage,
  ].join("\n");
}

function readText(value: string | undefined): string {
  const text = value?.trim();

  if (text === undefined || text.length === 0) {
    throw new AppError("AI_ASSIST_FAILED", "Gemini discover planner returned no text output.", 502);
  }

  return text;
}

function parseJson(text: string): unknown {
  const jsonText = extractJsonText(text);

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new AppError("AI_ASSIST_FAILED", "Gemini discover planner returned non-JSON output.", 502);
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
