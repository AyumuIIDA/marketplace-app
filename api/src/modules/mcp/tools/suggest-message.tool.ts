import { z } from "zod";

import type { SuggestMessageUseCase } from "../../ai-assistance/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const suggestMessageToolInputSchema = z.object({
  orderId: z.string().min(1),
  intent: z.string().trim().min(1).optional(),
  tone: z.string().trim().min(1).optional(),
});

export type SuggestMessageToolDeps = {
  suggestMessageUseCase: SuggestMessageUseCase;
};

export class SuggestMessageTool implements McpTool {
  readonly name = "suggest_message";
  readonly inputSchema = suggestMessageToolInputSchema.shape;

  constructor(private readonly deps: SuggestMessageToolDeps) {}

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const parsed = suggestMessageToolInputSchema.parse(input);
    const output = await this.deps.suggestMessageUseCase.execute({
      orderId: parsed.orderId,
      intent: parsed.intent,
      tone: parsed.tone,
    });

    return toolSucceeded(output);
  }
}
