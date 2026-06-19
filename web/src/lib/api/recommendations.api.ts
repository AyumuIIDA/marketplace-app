import { bffJson, isBffError } from "./bff-client";
import type { Listing } from "./listings.api";

// ScoredListing は出品にベクトル検索スコアを添えたもの（API: ListingView + score）。
export type ScoredListing = Listing & { score: number };

// 404(endpoint未デプロイ) / 401 は「結果なし」として扱い、呼び出し側のフォールバックに委ねる。
function isAbsentOrUnauthorized(error: unknown): boolean {
  return isBffError(error) && (error.status === 404 || error.status === 401);
}

export type SemanticSearchInput = {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
};

export type DiscoverAskInput = { query: string; provider?: "gemini" | "openai" };
export type DiscoverAskOutput = { assistantMessage: string; items: ScoredListing[] };

// discoverAsk は単段RAG（意味検索→LLM根拠付き生成）。/recommendations/ask（POST）。
export async function discoverAsk(input: DiscoverAskInput): Promise<DiscoverAskOutput> {
  const query = input.query.trim();

  if (query.length === 0) {
    return { assistantMessage: "", items: [] };
  }

  try {
    return await bffJson<DiscoverAskOutput>("/recommendations/ask", {
      method: "POST",
      body: { query, provider: input.provider ?? "gemini" },
    });
  } catch (error) {
    if (isAbsentOrUnauthorized(error)) {
      return { assistantMessage: "", items: [] };
    }

    throw error;
  }
}

// semanticSearch は CLIP×Gemini のハイブリッド意味検索（/recommendations/search）。
export async function semanticSearch(input: SemanticSearchInput): Promise<ScoredListing[]> {
  const query = input.query.trim();

  if (query.length === 0) {
    return [];
  }

  const params = new URLSearchParams({ q: query });

  if (input.category !== undefined && input.category.trim().length > 0) {
    params.set("category", input.category.trim());
  }

  if (input.minPrice !== undefined) {
    params.set("minPrice", input.minPrice.toString());
  }

  if (input.maxPrice !== undefined) {
    params.set("maxPrice", input.maxPrice.toString());
  }

  if (input.limit !== undefined) {
    params.set("limit", input.limit.toString());
  }

  try {
    const output = await bffJson<{ items: ScoredListing[] }>(
      `/recommendations/search?${params.toString()}`,
    );

    return output.items;
  } catch (error) {
    if (isAbsentOrUnauthorized(error)) {
      return [];
    }

    throw error;
  }
}

// similarListings は画像→画像の類似商品（/recommendations/similar/{listingId}）。
export async function similarListings(
  listingId: string,
  limit = 12,
): Promise<ScoredListing[]> {
  try {
    const output = await bffJson<{ items: ScoredListing[] }>(
      `/recommendations/similar/${listingId}?limit=${limit}`,
    );

    return output.items;
  } catch (error) {
    if (isAbsentOrUnauthorized(error)) {
      return [];
    }

    throw error;
  }
}
