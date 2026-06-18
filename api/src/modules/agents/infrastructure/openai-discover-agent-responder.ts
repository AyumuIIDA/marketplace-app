import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
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

export type OpenAiDiscoverAgentResponderDeps = {
  client: OpenAI;
  model: string;
};

export class OpenAiDiscoverAgentResponder implements DiscoverAgentResponder {
  constructor(private readonly deps: OpenAiDiscoverAgentResponderDeps) {}

  async buildReply(input: BuildDiscoverAgentReplyInput): Promise<BuildDiscoverAgentReplyOutput> {
    const response = await this.deps.client.responses.parse({
      model: this.deps.model,
      input: buildPrompt(input),
      text: { format: zodTextFormat(discoverAgentReplySchema, "discover_agent_reply") },
    });

    if (response.output_parsed === null) {
      throw new AppError("AI_ASSIST_FAILED", "OpenAI discover agent returned no structured output.", 502);
    }

    return response.output_parsed;
  }
}

function buildPrompt(input: BuildDiscoverAgentReplyInput): string {
  return [
    "You are a marketplace shopping assistant.",
    "Continue reasoning after the MCP tool call by reading the search_listings result.",
    "Do not invent facts that are not present in the search results.",
    "If there are candidates, compare them briefly using title, price, condition, category, and signed status.",
    "If there are no candidates, suggest how to broaden the request.",
    "Respond in the user's language.",
    "Conversation history JSON:",
    JSON.stringify(input.messages.slice(-8)),
    "Latest user message:",
    input.userMessage,
    "MCP tool calls JSON:",
    JSON.stringify(input.toolCalls),
    "MCP tool results JSON:",
    JSON.stringify(input.toolResults),
    "Search results JSON:",
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
