import type { ZodRawShape } from "zod";

import type { ToolContext } from "./tool-context.js";
import type { ToolResult } from "./tool-result.js";

export interface McpTool {
  readonly name: string;
  // SDKのregisterToolへ渡す入力スキーマ（client広告用）。未登録toolは未設定でよい。
  readonly inputSchema?: ZodRawShape;
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}
