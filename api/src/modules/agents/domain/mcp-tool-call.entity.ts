import type { McpToolCallStatus } from "./mcp-tool-call-status.type.js";

export type JsonSummary = Record<string, unknown>;

export type McpToolCallProps = {
  id: string;
  agentId?: string;
  userId: string;
  toolName: string;
  inputSummary?: JsonSummary;
  outputSummary?: JsonSummary;
  status: McpToolCallStatus;
  createdAt: Date;
};

export type CreateMcpToolCallProps = Omit<McpToolCallProps, "createdAt"> & {
  now: Date;
};

export class McpToolCall {
  private constructor(private props: McpToolCallProps) {}

  static create(input: CreateMcpToolCallProps): McpToolCall {
    return new McpToolCall({
      id: input.id,
      agentId: input.agentId,
      userId: input.userId,
      toolName: input.toolName,
      inputSummary: input.inputSummary,
      outputSummary: input.outputSummary,
      status: input.status,
      createdAt: input.now,
    });
  }

  static rehydrate(props: McpToolCallProps): McpToolCall {
    return new McpToolCall({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get snapshot(): McpToolCallProps {
    return { ...this.props };
  }
}
