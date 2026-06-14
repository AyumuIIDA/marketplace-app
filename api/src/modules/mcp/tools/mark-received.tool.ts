import { z } from "zod";

import type { MarkOrderReceivedUseCase } from "../../orders/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const markReceivedToolInputSchema = z.object({
  orderId: z.string().min(1),
});

export type MarkReceivedToolDeps = {
  markOrderReceivedUseCase: MarkOrderReceivedUseCase;
};

export class MarkReceivedTool implements McpTool {
  readonly name = "mark_received";
  readonly inputSchema = markReceivedToolInputSchema.shape;

  constructor(private readonly deps: MarkReceivedToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = markReceivedToolInputSchema.parse(input);
    // 受取確定できるのは購入者本人のみ。buyerId=contextでusecase側が当事者検証。
    const output = await this.deps.markOrderReceivedUseCase.execute({
      orderId: parsed.orderId,
      buyerId: context.userId,
    });

    return toolSucceeded(output);
  }
}
