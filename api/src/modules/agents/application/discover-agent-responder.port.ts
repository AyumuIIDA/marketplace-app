import type { ListingOutput } from "../../listings/index.js";

export type DiscoverAgentResponderMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DiscoverAgentToolCallSummary = {
  toolName: string;
  arguments: Record<string, unknown>;
  status: string;
};

export type BuildDiscoverAgentReplyInput = {
  userMessage: string;
  messages: DiscoverAgentResponderMessage[];
  listings: ListingOutput[];
  toolCalls: DiscoverAgentToolCallSummary[];
  toolResults: unknown[];
};

export type BuildDiscoverAgentReplyOutput = {
  assistantMessage: string;
};

export interface DiscoverAgentResponder {
  buildReply(input: BuildDiscoverAgentReplyInput): Promise<BuildDiscoverAgentReplyOutput>;
}
