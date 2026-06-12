import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { agentStatusEnum } from "./enums.js";
import { users } from "./users.js";
export const agents = pgTable("agents", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    name: varchar("name", { length: 120 }).notNull(),
    status: agentStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("agents_user_id_idx").on(table.userId)]);
