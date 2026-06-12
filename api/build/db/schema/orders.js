import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { orderStatusEnum } from "./enums.js";
import { listings } from "./listings.js";
import { users } from "./users.js";
export const orders = pgTable("orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
        .notNull()
        .references(() => listings.id),
    buyerId: uuid("buyer_id")
        .notNull()
        .references(() => users.id),
    sellerId: uuid("seller_id")
        .notNull()
        .references(() => users.id),
    status: orderStatusEnum("status").notNull().default("PAID"),
    price: integer("price").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("JPY"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
}, (table) => [
    check("orders_price_positive_chk", sql `${table.price} > 0`),
    check("orders_buyer_seller_distinct_chk", sql `${table.buyerId} <> ${table.sellerId}`),
    uniqueIndex("orders_listing_id_uidx").on(table.listingId),
    index("orders_buyer_id_idx").on(table.buyerId),
    index("orders_seller_id_idx").on(table.sellerId),
    index("orders_status_idx").on(table.status),
]);
