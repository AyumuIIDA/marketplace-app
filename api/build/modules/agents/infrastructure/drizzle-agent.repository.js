import { and, asc, eq } from "drizzle-orm";
import { agents } from "../../../db/schema/index.js";
import { Agent } from "../domain/index.js";
export class DrizzleAgentRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(agent) {
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
    async findById(agentId) {
        const [row] = await this.db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
        if (row === undefined) {
            return undefined;
        }
        return rehydrateAgent(row);
    }
    async search(input) {
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
function rehydrateAgent(row) {
    return Agent.rehydrate({
        id: row.id,
        userId: row.userId,
        name: row.name,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}
