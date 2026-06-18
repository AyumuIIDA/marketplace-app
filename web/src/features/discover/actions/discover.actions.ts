"use server";

import { searchListings } from "../../../lib/api/listings.api";
import { semanticSearch } from "../../../lib/api/recommendations.api";
import { bffJson } from "../../../lib/api/bff-client";
import type { Listing } from "../../../lib/api/listings.api";
import type { ListingViewModel } from "../../listings/listing-view-model";
import { mapListingsToViewModels } from "../../listings/listing.mapper";

/*
  AIネイティブ検索の境界。CLIP×Gemini のハイブリッド意味検索(/recommendations/search)を優先し、
  未デプロイ/0件のときだけ本体APIのkeyword検索へ降格する。差し替えはこの境界のみ。
*/
export async function discoverSearchAction(query: string): Promise<ListingViewModel[]> {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const semantic = await semanticSearch({ query: trimmed, limit: 24 });
  const listings =
    semantic.length > 0 ? semantic : await searchListings({ keyword: trimmed, limit: 24 });

  return mapListingsToViewModels(listings);
}

export type DiscoverAgentActionOutput = {
  assistantMessage: string;
  listings: ListingViewModel[];
  steps: Array<{
    index: number;
    actor: "llm" | "mcp";
    phase: "plan" | "tool_call" | "reply" | "output";
    label: string;
    status: string;
    toolName?: string;
  }>;
  toolCalls: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    status: string;
  }>;
};

export type DiscoverAgentMessageInput = {
  role: "user" | "assistant";
  content: string;
};

export async function discoverAgentAction(
  message: string,
  messages: DiscoverAgentMessageInput[] = [],
): Promise<DiscoverAgentActionOutput> {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return {
      assistantMessage: "",
      listings: [],
      steps: [],
      toolCalls: [],
    };
  }

  const output = await bffJson<{
    assistantMessage: string;
    listings: Listing[];
    steps: DiscoverAgentActionOutput["steps"];
    toolCalls: DiscoverAgentActionOutput["toolCalls"];
  }>("/agents/runs", {
    method: "POST",
    body: {
      message: trimmed,
      messages,
    },
  });

  return {
    assistantMessage: output.assistantMessage,
    listings: mapListingsToViewModels(output.listings),
    steps: output.steps,
    toolCalls: output.toolCalls,
  };
}
