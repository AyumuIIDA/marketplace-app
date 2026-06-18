import { AppError, ValidationAppError } from "../../../shared/index.js";
import type { McpToolGateway, ToolContext, ToolResult } from "../../mcp/index.js";
import type { ListingOutput } from "../../listings/index.js";
import type { DiscoverAgentPlanner } from "./discover-agent-planner.port.js";
import type { DiscoverAgentResponder } from "./discover-agent-responder.port.js";

export type RunDiscoverAgentInput = {
  userId: string;
  agentId?: string;
  message: string;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export type RunDiscoverAgentOutput = {
  status: "COMPLETED";
  assistantMessage: string;
  listings: ListingOutput[];
  steps: RunDiscoverAgentStep[];
  toolCalls: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    status: ToolResult["status"];
  }>;
};

export type RunDiscoverAgentStep = {
  index: number;
  actor: "llm" | "mcp";
  phase: "plan" | "tool_call" | "reply" | "output";
  label: string;
  status: "COMPLETED" | "SKIPPED";
  toolName?: string;
};

export type RunDiscoverAgentDeps = {
  createMcpToolGateway(context: ToolContext): McpToolGateway;
  discoverAgentPlanner: DiscoverAgentPlanner;
  discoverAgentResponder: DiscoverAgentResponder;
};

const MAX_TOOL_STEPS = 3;

export class RunDiscoverAgentUseCase {
  constructor(private readonly deps: RunDiscoverAgentDeps) {}

  async execute(input: RunDiscoverAgentInput): Promise<RunDiscoverAgentOutput> {
    const message = input.message.trim();

    if (message.length === 0) {
      throw new ValidationAppError("Message is required.");
    }

    const gateway = this.deps.createMcpToolGateway({
      userId: input.userId,
      agentId: input.agentId,
    });
    const steps: RunDiscoverAgentStep[] = [];
    const listings: ListingOutput[] = [];
    const toolCalls: RunDiscoverAgentOutput["toolCalls"] = [];
    const toolResults: Exclude<ToolResult, { status: "FAILED" }>[] = [];
    const executedPlans = new Set<string>();

    for (let toolStep = 1; toolStep <= MAX_TOOL_STEPS; toolStep += 1) {
      const plan = await this.deps.discoverAgentPlanner.planTool({
        userMessage: message,
        messages: toolStep === 1 ? [] : buildRunContextMessages(toolCalls, listings),
      });
      assertAllowedToolPlan(plan);

      const planKey = createPlanKey(plan);
      if (executedPlans.has(planKey)) {
        steps.push(
          createStep(
            steps.length + 1,
            "llm",
            "plan",
            "LLM selected an already executed tool plan",
            "SKIPPED",
            plan.toolName,
          ),
        );
        break;
      }
      executedPlans.add(planKey);
      steps.push(createStep(steps.length + 1, "llm", "plan", `LLM selected ${plan.toolName}`, "COMPLETED", plan.toolName));

      const rawResult = await gateway.callTool({
        name: plan.toolName,
        arguments: plan.arguments,
      });
      const result = parseToolResult(rawResult);

      if (result.status === "FAILED") {
        throw new AppError(result.error.code, result.error.message, 500, result.error.details);
      }

      toolResults.push(result);
      toolCalls.push({
        toolName: plan.toolName,
        arguments: plan.arguments,
        status: result.status,
      });
      mergeListings(listings, filterListings(readListings(result), message));
      steps.push(
        createStep(
          steps.length + 1,
          "mcp",
          "tool_call",
          `MCP tool ${plan.toolName} completed`,
          "COMPLETED",
          plan.toolName,
        ),
      );
    }

    const reply = await this.deps.discoverAgentResponder.buildReply({
      userMessage: message,
      messages: input.messages ?? [],
      listings,
      toolCalls,
      toolResults,
    });
    steps.push(createStep(steps.length + 1, "llm", "reply", "LLM composed the discover reply", "COMPLETED"));
    const rawOutputResult = await gateway.callTool({
      name: "present_discover_output",
      arguments: {
        assistantMessage: reply.assistantMessage,
        listingIds: listings.map((listing) => listing.listingId),
      },
    });
    const outputResult = parseToolResult(rawOutputResult);
    steps.push(
      createStep(
        steps.length + 1,
        "mcp",
        "output",
        "Output MCP tool validated the final answer",
        "COMPLETED",
        "present_discover_output",
      ),
    );

    return {
      status: "COMPLETED",
      assistantMessage: readAssistantMessage(outputResult),
      listings,
      steps,
      toolCalls: [
        ...toolCalls,
        {
          toolName: "present_discover_output",
          arguments: {
            assistantMessage: reply.assistantMessage,
            listingIds: listings.map((listing) => listing.listingId),
          },
          status: outputResult.status,
        },
      ],
    };
  }
}

function createStep(
  index: number,
  actor: RunDiscoverAgentStep["actor"],
  phase: RunDiscoverAgentStep["phase"],
  label: string,
  status: RunDiscoverAgentStep["status"],
  toolName?: string,
): RunDiscoverAgentStep {
  return {
    index,
    actor,
    phase,
    label,
    status,
    ...(toolName === undefined ? {} : { toolName }),
  };
}

function createPlanKey(plan: { toolName: string; arguments: Record<string, unknown> }): string {
  return `${plan.toolName}:${JSON.stringify(plan.arguments)}`;
}

function buildRunContextMessages(
  toolCalls: RunDiscoverAgentOutput["toolCalls"],
  listings: ListingOutput[],
): Array<{ role: "assistant"; content: string }> {
  return [
    {
      role: "assistant",
      content: [
        `Current run already executed tools: ${toolCalls.map((call) => call.toolName).join(", ") || "none"}.`,
        `Current run listing IDs: ${listings.map((listing) => listing.listingId).join(", ") || "none"}.`,
      ].join("\n"),
    },
  ];
}

function mergeListings(target: ListingOutput[], next: ListingOutput[]): void {
  const existingIds = new Set(target.map((listing) => listing.listingId));

  for (const listing of next) {
    if (existingIds.has(listing.listingId)) {
      continue;
    }
    target.push(listing);
    existingIds.add(listing.listingId);
  }
}

function parseToolResult(rawResult: { structuredContent?: Record<string, unknown>; contentText: string }): ToolResult {
  if (rawResult.structuredContent !== undefined) {
    return rawResult.structuredContent as ToolResult;
  }

  try {
    return JSON.parse(rawResult.contentText) as ToolResult;
  } catch {
    throw new AppError("DISCOVER_AGENT_TOOL_RESULT_INVALID", "MCP tool returned invalid JSON.", 500);
  }
}

function includesSignedIntent(message: string): boolean {
  const lower = message.toLowerCase();

  return (
    lower.includes("署名") ||
    lower.includes("verified") ||
    lower.includes("human-signed") ||
    lower.includes("human signed")
  );
}

function readListings(result: Exclude<ToolResult, { status: "FAILED" }>): ListingOutput[] {
  if (result.status !== "SUCCEEDED") {
    return [];
  }

  const data = result.data;

  if (
    typeof data === "object" &&
    data !== null &&
    "items" in data &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    return (data as { items: ListingOutput[] }).items;
  }

  if (typeof data === "object" && data !== null && "listingId" in data) {
    return [data as ListingOutput];
  }

  return [];
}

function readAssistantMessage(result: ToolResult): string {
  if (result.status === "FAILED") {
    throw new AppError(result.error.code, result.error.message, 500, result.error.details);
  }

  const data = result.data;

  if (
    typeof data === "object" &&
    data !== null &&
    "assistantMessage" in data &&
    typeof (data as { assistantMessage?: unknown }).assistantMessage === "string"
  ) {
    return (data as { assistantMessage: string }).assistantMessage;
  }

  throw new AppError("DISCOVER_AGENT_OUTPUT_INVALID", "Output MCP tool returned invalid output.", 500);
}

function filterListings(listings: ListingOutput[], message: string): ListingOutput[] {
  if (!includesSignedIntent(message)) {
    return listings;
  }

  return listings.filter((listing) => listing.signatureId !== undefined);
}

function assertAllowedToolPlan(plan: { toolName: string; arguments: Record<string, unknown> }): void {
  if (
    plan.toolName !== "search_listings" &&
    plan.toolName !== "get_listing" &&
    plan.toolName !== "compare_listings" &&
    plan.toolName !== "suggest_price"
  ) {
    throw new AppError("DISCOVER_AGENT_TOOL_NOT_ALLOWED", "Selected MCP tool is not allowed.", 400, {
      toolName: plan.toolName,
    });
  }
}
