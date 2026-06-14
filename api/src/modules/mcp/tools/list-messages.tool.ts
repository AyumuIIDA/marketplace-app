import { z } from "zod";

import type { ListOrderMessagesOperation } from "../../../app/workflows/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const listMessagesToolInputSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["SENT", "HIDDEN"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type ListMessagesToolDeps = {
  listOrderMessagesWorkflow: ListOrderMessagesOperation;
};

export class ListMessagesTool implements McpTool {
  readonly name = "list_messages";
  readonly inputSchema = listMessagesToolInputSchema.shape;

  constructor(private readonly deps: ListMessagesToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = listMessagesToolInputSchema.parse(input);
    // RESTと同じworkflow経由。participantId=contextで注文当事者のみ閲覧可。
    const output = await this.deps.listOrderMessagesWorkflow.execute({
      orderId: parsed.orderId,
      participantId: context.userId,
      status: parsed.status,
      limit: parsed.limit,
    });

    return toolSucceeded(output);
  }
}
