-- +goose Up
-- +goose StatementBegin
-- 既存 api/drizzle/0000..0003 を適用した最終状態と等価な統合スキーマ。
-- 新規DB(Cloud SQL等)はこのbaselineを `goose up` で適用する。
-- 既存の marketplace_domain は drizzle で同一スキーマが既に存在するため、
-- goose は version stamp のみ行う（README参照）。新規objectは作らない。

CREATE TYPE "agent_status" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "ai_action_type" AS ENUM ('CREATE_LISTING_DRAFT', 'PUBLISH_LISTING', 'UPDATE_LISTING', 'SEARCH_LISTINGS', 'COMPARE_LISTINGS', 'SUGGEST_PRICE', 'SUGGEST_MESSAGE', 'SEND_MESSAGE', 'PREPARE_PURCHASE', 'PURCHASE_ITEM', 'SUGGEST_REVIEW', 'SUBMIT_REVIEW');
CREATE TYPE "listing_status" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD', 'HIDDEN');
CREATE TYPE "mcp_tool_call_status" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'REQUIRES_HUMAN_SIGNATURE', 'REQUIRES_CONFIRMATION');
CREATE TYPE "message_status" AS ENUM ('SENT', 'HIDDEN');
CREATE TYPE "order_status" AS ENUM ('PAID', 'SHIPPED', 'RECEIVED', 'COMPLETED', 'CANCELED');
CREATE TYPE "review_status" AS ENUM ('DRAFT', 'SUBMITTED', 'HIDDEN');
CREATE TYPE "signature_format" AS ENUM ('JWS');
CREATE TYPE "signature_status" AS ENUM ('VALID', 'REVOKED');
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"email" varchar(255),
	"avatar_url" varchar(2048),
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"human_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"status" "agent_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "world_id_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(255) NOT NULL,
	"nullifier_hash" varchar(255) NOT NULL,
	"verification_level" varchar(64) NOT NULL,
	"signal_hash" varchar(128),
	"environment" varchar(32) DEFAULT 'production' NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "human_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" varchar(80) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_id" uuid NOT NULL,
	"payload_hash" varchar(128) NOT NULL,
	"signature_format" "signature_format" DEFAULT 'JWS' NOT NULL,
	"signature_value" text NOT NULL,
	"world_id_verification_id" uuid NOT NULL,
	"status" "signature_status" DEFAULT 'VALID' NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);

CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"agent_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'JPY' NOT NULL,
	"category" varchar(120) NOT NULL,
	"condition" varchar(80) NOT NULL,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"signature_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	CONSTRAINT "listings_price_positive_chk" CHECK ("price" > 0)
);

CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"image_hash" varchar(128) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'PAID' NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'JPY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "orders_price_positive_chk" CHECK ("price" > 0),
	CONSTRAINT "orders_buyer_seller_distinct_chk" CHECK ("buyer_id" <> "seller_id")
);

CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"agent_id" uuid,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" "review_status" DEFAULT 'DRAFT' NOT NULL,
	"signature_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	CONSTRAINT "reviews_rating_range_chk" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"agent_id" uuid,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'SENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	CONSTRAINT "messages_sender_recipient_distinct_chk" CHECK ("sender_id" <> "recipient_id")
);

CREATE TABLE "ai_action_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"user_id" uuid NOT NULL,
	"action_type" "ai_action_type" NOT NULL,
	"resource_type" varchar(80),
	"resource_id" uuid,
	"model" varchar(120),
	"prompt_summary" jsonb,
	"result_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "mcp_tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"user_id" uuid NOT NULL,
	"tool_name" varchar(120) NOT NULL,
	"input_summary" jsonb,
	"output_summary" jsonb,
	"status" "mcp_tool_call_status" DEFAULT 'STARTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "world_id_verifications" ADD CONSTRAINT "world_id_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "human_signatures" ADD CONSTRAINT "human_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "human_signatures" ADD CONSTRAINT "human_signatures_world_id_verification_id_world_id_verifications_id_fk" FOREIGN KEY ("world_id_verification_id") REFERENCES "world_id_verifications"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_signature_id_human_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "human_signatures"("id");
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "users"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_signature_id_human_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "human_signatures"("id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "users"("id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "mcp_tool_calls" ADD CONSTRAINT "mcp_tool_calls_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");
ALTER TABLE "mcp_tool_calls" ADD CONSTRAINT "mcp_tool_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

CREATE UNIQUE INDEX "auth_identities_provider_subject_uidx" ON "auth_identities" ("provider", "provider_subject");
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities" ("user_id");
CREATE INDEX "agents_user_id_idx" ON "agents" ("user_id");
CREATE INDEX "world_id_verifications_user_id_idx" ON "world_id_verifications" ("user_id");
CREATE INDEX "world_id_verifications_nullifier_hash_idx" ON "world_id_verifications" ("nullifier_hash");
CREATE INDEX "world_id_verifications_user_verified_at_idx" ON "world_id_verifications" ("user_id", "verified_at");
CREATE INDEX "world_id_verifications_action_nullifier_idx" ON "world_id_verifications" ("action", "nullifier_hash");
CREATE INDEX "human_signatures_user_id_idx" ON "human_signatures" ("user_id");
CREATE INDEX "human_signatures_resource_idx" ON "human_signatures" ("resource_type", "resource_id");
CREATE INDEX "human_signatures_action_type_idx" ON "human_signatures" ("action_type");
CREATE UNIQUE INDEX "human_signatures_valid_resource_payload_uidx" ON "human_signatures" ("action_type", "resource_type", "resource_id", "payload_hash") WHERE "status" = 'VALID';
CREATE INDEX "listings_seller_id_idx" ON "listings" ("seller_id");
CREATE INDEX "listings_status_idx" ON "listings" ("status");
CREATE INDEX "listings_category_status_idx" ON "listings" ("category", "status");
CREATE INDEX "listings_price_idx" ON "listings" ("price");
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images" ("listing_id");
CREATE UNIQUE INDEX "orders_listing_id_uidx" ON "orders" ("listing_id");
CREATE INDEX "orders_buyer_id_idx" ON "orders" ("buyer_id");
CREATE INDEX "orders_seller_id_idx" ON "orders" ("seller_id");
CREATE INDEX "orders_status_idx" ON "orders" ("status");
CREATE INDEX "reviews_order_id_idx" ON "reviews" ("order_id");
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews" ("reviewee_id");
CREATE UNIQUE INDEX "reviews_submitted_order_reviewer_uidx" ON "reviews" ("order_id", "reviewer_id") WHERE "status" = 'SUBMITTED';
CREATE INDEX "messages_order_id_idx" ON "messages" ("order_id");
CREATE INDEX "messages_sender_id_idx" ON "messages" ("sender_id");
CREATE INDEX "messages_recipient_id_idx" ON "messages" ("recipient_id");
CREATE INDEX "messages_created_at_idx" ON "messages" ("created_at");
CREATE INDEX "ai_action_logs_user_id_idx" ON "ai_action_logs" ("user_id");
CREATE INDEX "ai_action_logs_agent_id_idx" ON "ai_action_logs" ("agent_id");
CREATE INDEX "ai_action_logs_resource_idx" ON "ai_action_logs" ("resource_type", "resource_id");
CREATE INDEX "ai_action_logs_created_at_idx" ON "ai_action_logs" ("created_at");
CREATE INDEX "mcp_tool_calls_user_id_idx" ON "mcp_tool_calls" ("user_id");
CREATE INDEX "mcp_tool_calls_agent_id_idx" ON "mcp_tool_calls" ("agent_id");
CREATE INDEX "mcp_tool_calls_tool_name_idx" ON "mcp_tool_calls" ("tool_name");
CREATE INDEX "mcp_tool_calls_created_at_idx" ON "mcp_tool_calls" ("created_at");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "mcp_tool_calls";
DROP TABLE IF EXISTS "ai_action_logs";
DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "reviews";
DROP TABLE IF EXISTS "orders";
DROP TABLE IF EXISTS "listing_images";
DROP TABLE IF EXISTS "listings";
DROP TABLE IF EXISTS "human_signatures";
DROP TABLE IF EXISTS "world_id_verifications";
DROP TABLE IF EXISTS "agents";
DROP TABLE IF EXISTS "auth_identities";
DROP TABLE IF EXISTS "users";
DROP TYPE IF EXISTS "user_status";
DROP TYPE IF EXISTS "signature_status";
DROP TYPE IF EXISTS "signature_format";
DROP TYPE IF EXISTS "review_status";
DROP TYPE IF EXISTS "order_status";
DROP TYPE IF EXISTS "message_status";
DROP TYPE IF EXISTS "mcp_tool_call_status";
DROP TYPE IF EXISTS "listing_status";
DROP TYPE IF EXISTS "ai_action_type";
DROP TYPE IF EXISTS "agent_status";
-- +goose StatementEnd
