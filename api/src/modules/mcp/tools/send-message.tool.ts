import { z } from "zod";

import type { McpTool } from "../mcp-tool.js";
import type { SendOrderMessageOperation } from "../../../app/workflows/index.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

const sendMessageToolInputSchema = z.object({
  orderId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export type SendMessageToolDeps = {
  sendOrderMessageWorkflow: SendOrderMessageOperation;
};

export class SendMessageTool implements McpTool {
  readonly name = "send_message";
  readonly inputSchema = sendMessageToolInputSchema.shape;

  constructor(private readonly deps: SendMessageToolDeps) {}

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = sendMessageToolInputSchema.parse(input);
    const output = await this.deps.sendOrderMessageWorkflow.execute({
      orderId: parsed.orderId,
      senderId: context.userId,
      body: parsed.body,
      agentId: context.agentId,
    });

    return toolSucceeded(output);
  }
}
