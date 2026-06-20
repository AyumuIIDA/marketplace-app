"use server";

import { searchListings } from "../../../lib/api/listings.api";
import {
  discoverAsk,
  semanticSearch,
  type DiscoverRetrievalMode,
} from "../../../lib/api/recommendations.api";
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
  // 実際の取得経路。RAG経路のみ付与（semantic / keyword）。手順表示を事実と一致させる。
  retrievalMode?: DiscoverRetrievalMode;
};

export type DiscoverAgentMessageInput = {
  role: "user" | "assistant";
  content: string;
};

// AIベンダー。UIで毎回切替できる（gemini=Gemini, openai=ChatGPT）。
export type DiscoverProvider = "gemini" | "openai";

// 単段RAG（取得→生成）。discoverの主導線。多段ツール無しで堅牢・多言語。
// 出力は agent と同形（steps/toolCalls は空）にして UI をそのまま使える。
export async function discoverRagAction(
  message: string,
  provider: DiscoverProvider = "gemini",
): Promise<DiscoverAgentActionOutput> {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { assistantMessage: "", listings: [], steps: [], toolCalls: [] };
  }

  const out = await discoverAsk({ query: trimmed, provider });

  return {
    assistantMessage: out.assistantMessage,
    listings: mapListingsToViewModels(out.items),
    retrievalMode: out.retrievalMode,
    steps: [],
    toolCalls: [],
  };
}

export async function discoverAgentAction(
  message: string,
  messages: DiscoverAgentMessageInput[] = [],
  provider: DiscoverProvider = "gemini",
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
      provider,
    },
  });

  return {
    assistantMessage: output.assistantMessage,
    listings: mapListingsToViewModels(output.listings),
    steps: output.steps,
    toolCalls: output.toolCalls,
  };
}
