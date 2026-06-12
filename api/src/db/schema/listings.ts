import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { agents } from "./agents.js";
import { listingStatusEnum } from "./enums.js";
import { humanSignatures } from "./signatures.js";
import { users } from "./users.js";

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("JPY"),
    category: varchar("category", { length: 120 }).notNull(),
    condition: varchar("condition", { length: 80 }).notNull(),
    status: listingStatusEnum("status").notNull().default("DRAFT"),
    signatureId: uuid("signature_id").references(() => humanSignatures.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
  },
  (table) => [
    check("listings_price_positive_chk", sql`${table.price} > 0`),
    index("listings_seller_id_idx").on(table.sellerId),
    index("listings_status_idx").on(table.status),
    index("listings_category_status_idx").on(table.category, table.status),
    index("listings_price_idx").on(table.price),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    url: text("url").notNull(),
    imageHash: varchar("image_hash", { length: 128 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("listing_images_listing_id_idx").on(table.listingId)],
);
