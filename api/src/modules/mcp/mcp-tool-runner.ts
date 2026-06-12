import type { RecordMcpToolCallUseCase } from "../agents/application/index.js";

import type { McpTool } from "./mcp-tool.js";
import type { ToolContext } from "./tool-context.js";
import { toolFailed, type ToolResult } from "./tool-result.js";

export type McpToolRunnerDeps = {
  recordMcpToolCallUseCase: RecordMcpToolCallUseCase;
};

export class McpToolRunner {
  constructor(private readonly deps: McpToolRunnerDeps) {}

  async run(tool: McpTool, input: unknown, context: ToolContext): Promise<ToolResult> {
    const inputSummary = summarizeToolInput(input);

    try {
      const result = await tool.execute(input, context);
      await this.deps.recordMcpToolCallUseCase.execute({
        agentId: context.agentId,
        userId: context.userId,
        toolName: tool.name,
        inputSummary,
        outputSummary: summarizeToolResult(result),
        status: result.status,
      });

      return result;
    } catch (error: unknown) {
      const result = toolFailed(error);
      await this.deps.recordMcpToolCallUseCase.execute({
        agentId: context.agentId,
        userId: context.userId,
        toolName: tool.name,
        inputSummary,
        outputSummary: summarizeToolResult(result),
        status: result.status,
      });

      return result;
    }
  }
}

function summarizeToolInput(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object") {
    return {};
  }

  const value = input as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    if (key === "idKitResult") {
      summary[key] = "[redacted]";
      continue;
    }
    if (key === "body" || key === "comment" || key === "description") {
      summary[`${key}Length`] = typeof fieldValue === "string" ? fieldValue.length : undefined;
      continue;
    }
    summary[key] = fieldValue;
  }

  return summary;
}

function summarizeToolResult(result: ToolResult): Record<string, unknown> {
  if (result.status === "FAILED") {
    return {
      status: result.status,
      errorCode: result.error.code,
    };
  }

  return {
    status: result.status,
  };
}
