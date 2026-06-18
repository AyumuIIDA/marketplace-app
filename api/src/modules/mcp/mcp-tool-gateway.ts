export type McpToolCallGatewayInput = {
  name: string;
  arguments: Record<string, unknown>;
};

export type McpToolCallGatewayOutput = {
  structuredContent?: Record<string, unknown>;
  contentText: string;
};

export interface McpToolGateway {
  callTool(input: McpToolCallGatewayInput): Promise<McpToolCallGatewayOutput>;
}
