import { McpToolCall, } from "../domain/index.js";
export class RecordMcpToolCallUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
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
