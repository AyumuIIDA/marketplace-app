import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
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

export type OpenAiDiscoverAgentPlannerDeps = {
  client: OpenAI;
  model: string;
};

export class OpenAiDiscoverAgentPlanner implements DiscoverAgentPlanner {
  constructor(private readonly deps: OpenAiDiscoverAgentPlannerDeps) {}

  async planTool(input: PlanDiscoverAgentToolInput): Promise<DiscoverAgentToolPlan> {
    const response = await this.deps.client.responses.parse({
      model: this.deps.model,
      input: buildPlannerPrompt(input),
      text: { format: zodTextFormat(toolPlanSchema, "discover_agent_tool_plan") },
    });

    if (response.output_parsed === null) {
      throw new AppError("AI_ASSIST_FAILED", "OpenAI discover planner returned no structured output.", 502);
    }

    return response.output_parsed;
  }
}

function buildPlannerPrompt(input: PlanDiscoverAgentToolInput): string {
  return [
    "You are selecting exactly one MCP tool for a marketplace shopping assistant.",
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
