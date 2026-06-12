import { mcpToolCalls } from "../../../db/schema/index.js";
export class DrizzleMcpToolCallRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(toolCall) {
        const snapshot = toolCall.snapshot;
        await this.db.insert(mcpToolCalls).values({
            id: snapshot.id,
            agentId: snapshot.agentId,
            userId: snapshot.userId,
            toolName: snapshot.toolName,
            inputSummary: snapshot.inputSummary,
            outputSummary: snapshot.outputSummary,
            status: snapshot.status,
            createdAt: snapshot.createdAt,
        });
    }
}
