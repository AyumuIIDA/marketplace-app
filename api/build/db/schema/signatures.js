import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { signatureFormatEnum, signatureStatusEnum } from "./enums.js";
import { users } from "./users.js";
export const worldIdVerifications = pgTable("world_id_verifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    action: varchar("action", { length: 255 }).notNull(),
    nullifierHash: varchar("nullifier_hash", { length: 255 }).notNull(),
    verificationLevel: varchar("verification_level", { length: 64 }).notNull(),
    signalHash: varchar("signal_hash", { length: 128 }),
    environment: varchar("environment", { length: 32 }).notNull().default("production"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("world_id_verifications_user_id_idx").on(table.userId),
    index("world_id_verifications_nullifier_hash_idx").on(table.nullifierHash),
    index("world_id_verifications_user_verified_at_idx").on(table.userId, table.verifiedAt),
    index("world_id_verifications_action_nullifier_idx").on(table.action, table.nullifierHash),
]);
export const humanSignatures = pgTable("human_signatures", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    actionType: varchar("action_type", { length: 80 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    payloadHash: varchar("payload_hash", { length: 128 }).notNull(),
    signatureFormat: signatureFormatEnum("signature_format").notNull().default("JWS"),
    signatureValue: text("signature_value").notNull(),
    worldIdVerificationId: uuid("world_id_verification_id")
        .notNull()
        .references(() => worldIdVerifications.id),
    status: signatureStatusEnum("status").notNull().default("VALID"),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
    index("human_signatures_user_id_idx").on(table.userId),
    index("human_signatures_resource_idx").on(table.resourceType, table.resourceId),
    index("human_signatures_action_type_idx").on(table.actionType),
    uniqueIndex("human_signatures_valid_resource_payload_uidx")
        .on(table.actionType, table.resourceType, table.resourceId, table.payloadHash)
        .where(sql `${table.status} = 'VALID'`),
]);
