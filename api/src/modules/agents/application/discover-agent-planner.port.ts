export type DiscoverAgentPlannerMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DiscoverAgentToolPlan = {
  toolName: "search_listings" | "get_listing" | "compare_listings" | "suggest_price";
  arguments: Record<string, unknown>;
};

export type PlanDiscoverAgentToolInput = {
  userMessage: string;
  messages: DiscoverAgentPlannerMessage[];
};

export interface DiscoverAgentPlanner {
  planTool(input: PlanDiscoverAgentToolInput): Promise<DiscoverAgentToolPlan>;
}
