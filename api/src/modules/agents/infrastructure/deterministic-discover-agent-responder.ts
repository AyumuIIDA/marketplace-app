import type {
  BuildDiscoverAgentReplyInput,
  BuildDiscoverAgentReplyOutput,
  DiscoverAgentResponder,
} from "../application/index.js";

export class DeterministicDiscoverAgentResponder implements DiscoverAgentResponder {
  async buildReply(input: BuildDiscoverAgentReplyInput): Promise<BuildDiscoverAgentReplyOutput> {
    const isJapanese = /[ぁ-んァ-ン一-龯]/.test(input.userMessage);
    const firstToolResult = input.toolResults[0];

    if (
      typeof firstToolResult === "object" &&
      firstToolResult !== null &&
      "status" in firstToolResult &&
      "data" in firstToolResult &&
      input.listings.length === 0
    ) {
      return {
        assistantMessage: isJapanese
          ? `MCP tool ${input.toolCalls[0]?.toolName ?? "unknown"} の結果を確認しました。${JSON.stringify((firstToolResult as { data: unknown }).data)}`
          : `I checked the ${input.toolCalls[0]?.toolName ?? "unknown"} MCP tool result: ${JSON.stringify((firstToolResult as { data: unknown }).data)}`,
      };
    }

    if (input.listings.length === 0) {
      return {
        assistantMessage: isJapanese
          ? "条件に合う出品は見つかりませんでした。条件を少し広げて試してください。"
          : "I could not find matching listings. Try broadening the request.",
      };
    }

    const topListings = input.listings.slice(0, 3);
    const summary = topListings
      .map((listing, index) => {
        const signedLabel = listing.signatureId === undefined ? "" : isJapanese ? "・本人署名済み" : " · signed";

        return isJapanese
          ? `${index + 1}. ${listing.title} - ${listing.price.toLocaleString("ja-JP")}円${signedLabel}`
          : `${index + 1}. ${listing.title} - JPY ${listing.price.toLocaleString("en-US")}${signedLabel}`;
      })
      .join("\n");

    return {
      assistantMessage: isJapanese
        ? [`${input.listings.length}件の候補を見つけました。上位候補です。`, summary, "気になる商品があれば詳細を開いて比較できます。"].join("\n")
        : [`I found ${input.listings.length} matching listings. Top candidates:`, summary, "Open a listing to inspect details or ask me to narrow the results."].join("\n"),
    };
  }
}
