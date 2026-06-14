import { z } from "zod";

import type { GetCurrentUserUseCase } from "../../identity/index.js";
import type { McpTool } from "../mcp-tool.js";
import type { ToolContext } from "../tool-context.js";
import { toolSucceeded, type ToolResult } from "../tool-result.js";

// 入力なし。主体はcontext.userId（BFFが確定）から取る。
const getCurrentUserToolInputSchema = z.object({});

export type GetCurrentUserToolDeps = {
  getCurrentUserUseCase: GetCurrentUserUseCase;
};

export class GetCurrentUserTool implements McpTool {
  readonly name = "get_current_user";
  readonly inputSchema = getCurrentUserToolInputSchema.shape;

  constructor(private readonly deps: GetCurrentUserToolDeps) {}

  async execute(_input: unknown, context: ToolContext): Promise<ToolResult> {
    const output = await this.deps.getCurrentUserUseCase.execute({
      userId: context.userId,
    });

    return toolSucceeded(output);
  }
}
