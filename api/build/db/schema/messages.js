import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { messageStatusEnum } from "./enums.js";
import { orders } from "./orders.js";
import { users } from "./users.js";
export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
        .notNull()
        .references(() => orders.id),
    senderId: uuid("sender_id")
        .notNull()
        .references(() => users.id),
    recipientId: uuid("recipient_id")
        .notNull()
        .references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    body: text("body").notNull(),
    status: messageStatusEnum("status").notNull().default("SENT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
}, (table) => [
    check("messages_sender_recipient_distinct_chk", sql `${table.senderId} <> ${table.recipientId}`),
    index("messages_order_id_idx").on(table.orderId),
    index("messages_sender_id_idx").on(table.senderId),
    index("messages_recipient_id_idx").on(table.recipientId),
    index("messages_created_at_idx").on(table.createdAt),
]);
