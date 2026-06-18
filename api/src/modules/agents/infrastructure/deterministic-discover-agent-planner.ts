import type {
  DiscoverAgentPlanner,
  DiscoverAgentToolPlan,
  PlanDiscoverAgentToolInput,
} from "../application/index.js";

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

export class DeterministicDiscoverAgentPlanner implements DiscoverAgentPlanner {
  async planTool(input: PlanDiscoverAgentToolInput): Promise<DiscoverAgentToolPlan> {
    const text = toEffectiveMessage(input.userMessage, input.messages);
    const listingIds = [...text.matchAll(UUID_PATTERN)].map((match) => match[0]);
    const lower = text.toLowerCase();

    if ((lower.includes("compare") || lower.includes("比較")) && listingIds.length >= 2) {
      return {
        toolName: "compare_listings",
        arguments: { listingIds: listingIds.slice(0, 5) },
      };
    }

    if (listingIds.length >= 1 && (lower.includes("detail") || lower.includes("詳細") || lower.includes("show"))) {
      return {
        toolName: "get_listing",
        arguments: { listingId: listingIds[0] },
      };
    }

    if (lower.includes("price") || lower.includes("価格") || lower.includes("値段")) {
      return {
        toolName: "suggest_price",
        arguments: {
          title: normalizeKeyword(text) || "item",
          category: "general",
          condition: "good",
        },
      };
    }

    return {
      toolName: "search_listings",
      arguments: toSearchListingsArguments(input.userMessage),
    };
  }
}

function toEffectiveMessage(
  message: string,
  messages: Array<{ role: "user" | "assistant"; content: string }> | undefined,
): string {
  const previousMessages = (messages ?? [])
      .map((item) => item.content.trim())
      .filter((content) => content.length > 0)
      .slice(-3);

  if (previousMessages.length === 0) {
    return message;
  }

  return [...previousMessages, message].join(" ");
}

function toSearchListingsArguments(message: string): Record<string, unknown> {
  const maxPrice = readMaxPrice(message);
  const keyword = normalizeKeyword(message);

  return {
    ...(keyword.length > 0 ? { keyword } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    limit: 24,
  };
}

function readMaxPrice(message: string): number | undefined {
  const match = /(\d[\d,]*)\s*(万円|円|jpy|JPY)?/.exec(message);

  if (match === null) {
    return undefined;
  }

  const value = Number(match[1]?.replaceAll(",", ""));

  if (!Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return match[2] === "万円" ? value * 10000 : value;
}

function normalizeKeyword(message: string): string {
  return message
    .replace(UUID_PATTERN, " ")
    .replace(/\d[\d,]*\s*(万円|円|jpy|JPY)?/g, " ")
    .replace(/本人署名つき|本人署名付き|本人署名|署名つき|署名付き|署名済み|human-signed|human signed|verified/gi, " ")
    .replace(/以下|未満|以内|くらい|ぐらい|under|below|less than|find|search|look for|show me|jpy|yen|price|価格|値段/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
