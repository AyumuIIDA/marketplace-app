import type { Db } from "../../../db/client.js";
import { mcpToolCalls } from "../../../db/schema/index.js";
import type { McpToolCall, McpToolCallRepository } from "../domain/index.js";

export type McpToolCallRepositoryDb = Pick<Db, "insert">;

export class DrizzleMcpToolCallRepository implements McpToolCallRepository {
  constructor(private readonly db: McpToolCallRepositoryDb) {}

  async save(toolCall: McpToolCall): Promise<void> {
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
