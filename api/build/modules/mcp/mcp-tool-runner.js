import { toolFailed } from "./tool-result.js";
export class McpToolRunner {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async run(tool, input, context) {
        const inputSummary = summarizeToolInput(input);
        try {
            const result = await tool.execute(input, context);
            await this.deps.recordMcpToolCallUseCase.execute({
                agentId: context.agentId,
                userId: context.userId,
                toolName: tool.name,
                inputSummary,
                outputSummary: summarizeToolResult(result),
                status: result.status,
            });
            return result;
        }
        catch (error) {
            const result = toolFailed(error);
            await this.deps.recordMcpToolCallUseCase.execute({
                agentId: context.agentId,
                userId: context.userId,
                toolName: tool.name,
                inputSummary,
                outputSummary: summarizeToolResult(result),
                status: result.status,
            });
            return result;
        }
    }
}
function summarizeToolInput(input) {
    if (input === null || typeof input !== "object") {
        return {};
    }
    const value = input;
    const summary = {};
    for (const [key, fieldValue] of Object.entries(value)) {
        if (key === "idKitResult") {
            summary[key] = "[redacted]";
            continue;
        }
        if (key === "body" || key === "comment" || key === "description") {
            summary[`${key}Length`] = typeof fieldValue === "string" ? fieldValue.length : undefined;
            continue;
        }
        summary[key] = fieldValue;
    }
    return summary;
}
function summarizeToolResult(result) {
    if (result.status === "FAILED") {
        return {
            status: result.status,
            errorCode: result.error.code,
        };
    }
    return {
        status: result.status,
    };
}
