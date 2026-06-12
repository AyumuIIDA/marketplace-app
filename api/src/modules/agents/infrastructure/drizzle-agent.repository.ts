import { and, asc, eq } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { agents } from "../../../db/schema/index.js";
import { Agent, type AgentRepository, type AgentStatus, type SearchAgentsInput } from "../domain/index.js";

export type AgentRepositoryDb = Pick<Db, "insert" | "select">;

export class DrizzleAgentRepository implements AgentRepository {
  constructor(private readonly db: AgentRepositoryDb) {}

  async save(agent: Agent): Promise<void> {
    const snapshot = agent.snapshot;

    await this.db
      .insert(agents)
      .values({
        id: snapshot.id,
        userId: snapshot.userId,
        name: snapshot.name,
        status: snapshot.status,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      })
      .onConflictDoUpdate({
        target: agents.id,
        set: {
          name: snapshot.name,
          status: snapshot.status,
          updatedAt: snapshot.updatedAt,
        },
      });
  }

  async findById(agentId: string): Promise<Agent | undefined> {
    const [row] = await this.db.select().from(agents).where(eq(agents.id, agentId)).limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateAgent(row);
  }

  async search(input: SearchAgentsInput): Promise<Agent[]> {
    const conditions = [
      input.userId === undefined ? undefined : eq(agents.userId, input.userId),
      input.status === undefined ? undefined : eq(agents.status, input.status),
    ].filter((condition) => condition !== undefined);
    const rows = await this.db
      .select()
      .from(agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(agents.createdAt))
      .limit(input.limit ?? 50);

    return rows.map(rehydrateAgent);
  }
}

type AgentRow = typeof agents.$inferSelect;

function rehydrateAgent(row: AgentRow): Agent {
  return Agent.rehydrate({
    id: row.id,
    userId: row.userId,
    name: row.name,
    status: row.status as AgentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
