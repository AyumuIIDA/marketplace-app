import type { Clock, IdGenerator } from "../../../shared/index.js";
import {
  McpToolCall,
  type JsonSummary,
  type McpToolCallRepository,
  type McpToolCallStatus,
} from "../domain/index.js";

export type RecordMcpToolCallInput = {
  agentId?: string;
  userId: string;
  toolName: string;
  inputSummary?: JsonSummary;
  outputSummary?: JsonSummary;
  status: McpToolCallStatus;
};

export type RecordMcpToolCallDeps = {
  mcpToolCallRepository: McpToolCallRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class RecordMcpToolCallUseCase {
  constructor(private readonly deps: RecordMcpToolCallDeps) {}

  async execute(input: RecordMcpToolCallInput): Promise<{ toolCallId: string }> {
    const toolCall = McpToolCall.create({
      id: this.deps.idGenerator.newId(),
      agentId: input.agentId,
      userId: input.userId,
      toolName: input.toolName,
      inputSummary: input.inputSummary,
      outputSummary: input.outputSummary,
      status: input.status,
      now: this.deps.clock.now(),
    });

    await this.deps.mcpToolCallRepository.save(toolCall);

    return {
      toolCallId: toolCall.id,
    };
  }
}
