import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { userStatusEnum } from "./enums.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  avatarUrl: varchar("avatar_url", { length: 2048 }),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  humanVerifiedAt: timestamp("human_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerSubject: varchar("provider_subject", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_uidx").on(table.provider, table.providerSubject),
    index("auth_identities_user_id_idx").on(table.userId),
  ],
);
