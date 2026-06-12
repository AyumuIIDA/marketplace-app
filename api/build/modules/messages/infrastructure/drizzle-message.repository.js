import { and, asc, eq, or } from "drizzle-orm";
import { messages } from "../../../db/schema/index.js";
import { Message, } from "../domain/index.js";
export class DrizzleMessageRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(message) {
        const snapshot = message.snapshot;
        await this.db
            .insert(messages)
            .values({
            id: snapshot.id,
            orderId: snapshot.orderId,
            senderId: snapshot.senderId,
            recipientId: snapshot.recipientId,
            agentId: snapshot.agentId,
            body: snapshot.body,
            status: snapshot.status,
            createdAt: snapshot.createdAt,
            hiddenAt: snapshot.hiddenAt,
        })
            .onConflictDoUpdate({
            target: messages.id,
            set: {
                status: snapshot.status,
                hiddenAt: snapshot.hiddenAt,
            },
        });
    }
    async findById(messageId) {
        const [row] = await this.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
        if (row === undefined) {
            return undefined;
        }
        return rehydrateMessage(row);
    }
    async search(input) {
        const conditions = [
            input.orderId === undefined ? undefined : eq(messages.orderId, input.orderId),
            input.participantId === undefined
                ? undefined
                : or(eq(messages.senderId, input.participantId), eq(messages.recipientId, input.participantId)),
            input.senderId === undefined ? undefined : eq(messages.senderId, input.senderId),
            input.recipientId === undefined ? undefined : eq(messages.recipientId, input.recipientId),
            input.status === undefined ? undefined : eq(messages.status, input.status),
        ].filter((condition) => condition !== undefined);
        const rows = await this.db
            .select()
            .from(messages)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(messages.createdAt))
            .limit(input.limit ?? 50);
        return rows.map(rehydrateMessage);
    }
}
function rehydrateMessage(row) {
    return Message.rehydrate({
        id: row.id,
        orderId: row.orderId,
        senderId: row.senderId,
        recipientId: row.recipientId,
        agentId: row.agentId ?? undefined,
        body: row.body,
        status: row.status,
        createdAt: row.createdAt,
        hiddenAt: row.hiddenAt ?? undefined,
    });
}
