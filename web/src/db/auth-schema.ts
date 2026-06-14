// Auth.js(@auth/pg-adapter)用スキーマのdrizzle定義。
// 所有者はweb(BFF)。auth DB(Neon/ローカルのmarketplace_auth)に適用する。
// pg-adapterはこのテーブル/カラム名にraw SQLを発行するため、camelCase名は厳密一致させる。
// runtimeではimportしない（DDL著者・migrate専用）。queryはpg-adapterが担う。
import {
  bigint,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// id はuuid。gen_random_uuid()はPostgres13+のcore機能（pgcrypto拡張不要）。
// uuid文字列にすることでドメイン側(Cloud SQL)のuuid規約とも整合する。
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified", { withTimezone: true, mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    // OAuthトークンはこのテーブルに保存され、ブラウザ(session cookie)には出さない。
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: bigint("expires_at", { mode: "number" }),
    id_token: text("id_token"),
    scope: text("scope"),
    session_state: text("session_state"),
    token_type: text("token_type"),
  },
  (table) => [
    uniqueIndex("accounts_provider_providerAccountId_key").on(
      table.provider,
      table.providerAccountId,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
    sessionToken: varchar("sessionToken", { length: 255 }).notNull(),
  },
  (table) => [uniqueIndex("sessions_sessionToken_key").on(table.sessionToken)],
);

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);
