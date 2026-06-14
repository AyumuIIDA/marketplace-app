import { z } from "zod";

import type { MarkOrderShippedUseCase } from "../../orders/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const markShippedToolInputSchema = z.object({
  orderId: z.string().min(1),
});

export type MarkShippedToolDeps = {
  markOrderShippedUseCase: MarkOrderShippedUseCase;
};

export class MarkShippedTool implements McpTool {
  readonly name = "mark_shipped";
  readonly inputSchema = markShippedToolInputSchema.shape;

  constructor(private readonly deps: MarkShippedToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = markShippedToolInputSchema.parse(input);
    // 発送できるのは出品者本人のみ。sellerId=contextでusecase側が当事者検証。
    const output = await this.deps.markOrderShippedUseCase.execute({
      orderId: parsed.orderId,
      sellerId: context.userId,
    });

    return toolSucceeded(output);
  }
}
