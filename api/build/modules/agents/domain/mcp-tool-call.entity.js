export class McpToolCall {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(input) {
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
    static rehydrate(props) {
        return new McpToolCall({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get snapshot() {
        return { ...this.props };
    }
}
