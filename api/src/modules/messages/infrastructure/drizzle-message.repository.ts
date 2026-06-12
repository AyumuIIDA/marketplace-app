import { and, asc, eq, or } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { messages } from "../../../db/schema/index.js";
import {
  Message,
  type MessageRepository,
  type MessageStatus,
  type SearchMessagesInput,
} from "../domain/index.js";

export type MessageRepositoryDb = Pick<Db, "insert" | "select">;

export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: MessageRepositoryDb) {}

  async save(message: Message): Promise<void> {
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

  async findById(messageId: string): Promise<Message | undefined> {
    const [row] = await this.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateMessage(row);
  }

  async search(input: SearchMessagesInput): Promise<Message[]> {
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

type MessageRow = typeof messages.$inferSelect;

function rehydrateMessage(row: MessageRow): Message {
  return Message.rehydrate({
    id: row.id,
    orderId: row.orderId,
    senderId: row.senderId,
    recipientId: row.recipientId,
    agentId: row.agentId ?? undefined,
    body: row.body,
    status: row.status as MessageStatus,
    createdAt: row.createdAt,
    hiddenAt: row.hiddenAt ?? undefined,
  });
}
