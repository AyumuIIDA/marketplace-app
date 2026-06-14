import { z } from "zod";

import type { ListOrdersUseCase } from "../../orders/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const listOrdersToolInputSchema = z.object({
  status: z.enum(["PAID", "SHIPPED", "RECEIVED", "COMPLETED", "CANCELED"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type ListOrdersToolDeps = {
  listOrdersUseCase: ListOrdersUseCase;
};

export class ListOrdersTool implements McpTool {
  readonly name = "list_orders";
  readonly inputSchema = listOrdersToolInputSchema.shape;

  constructor(private readonly deps: ListOrdersToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = listOrdersToolInputSchema.parse(input);
    // 自分が当事者(購入/出品)の注文のみ。participantIdはcontextに固定。
    const output = await this.deps.listOrdersUseCase.execute({
      participantId: context.userId,
      status: parsed.status,
      limit: parsed.limit,
    });

    return toolSucceeded(output);
  }
}
