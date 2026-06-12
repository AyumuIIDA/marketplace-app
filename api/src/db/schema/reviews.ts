import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { agents } from "./agents.js";
import { reviewStatusEnum } from "./enums.js";
import { orders } from "./orders.js";
import { humanSignatures } from "./signatures.js";
import { users } from "./users.js";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id),
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    status: reviewStatusEnum("status").notNull().default("DRAFT"),
    signatureId: uuid("signature_id").references(() => humanSignatures.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  },
  (table) => [
    check("reviews_rating_range_chk", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    index("reviews_order_id_idx").on(table.orderId),
    index("reviews_reviewee_id_idx").on(table.revieweeId),
    uniqueIndex("reviews_submitted_order_reviewer_uidx")
      .on(table.orderId, table.reviewerId)
      .where(sql`${table.status} = 'SUBMITTED'`),
  ],
);
