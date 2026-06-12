CREATE TYPE "public"."agent_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."ai_action_type" AS ENUM('CREATE_LISTING_DRAFT', 'PUBLISH_LISTING', 'UPDATE_LISTING', 'SEARCH_LISTINGS', 'COMPARE_LISTINGS', 'SUGGEST_PRICE', 'SUGGEST_MESSAGE', 'SEND_MESSAGE', 'PREPARE_PURCHASE', 'PURCHASE_ITEM', 'SUGGEST_REVIEW', 'SUBMIT_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PUBLISHED', 'SOLD', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."mcp_tool_call_status" AS ENUM('STARTED', 'SUCCEEDED', 'FAILED', 'REQUIRES_HUMAN_SIGNATURE', 'REQUIRES_CONFIRMATION');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('SENT', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PAID', 'SHIPPED', 'RECEIVED', 'COMPLETED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('DRAFT', 'SUBMITTED', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."signature_format" AS ENUM('JWS');--> statement-breakpoint
CREATE TYPE "public"."signature_status" AS ENUM('VALID', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"avatar_url" varchar(2048),
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"status" "agent_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "world_id_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nullifier_hash" varchar(255) NOT NULL,
	"verification_level" varchar(64) NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"image_hash" varchar(128) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"sold_at" timestamp with time zone
);
--> statement-breakpoint
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
	"canceled_at" timestamp with time zone
);
--> statement-breakpoint
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
	"hidden_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"agent_id" uuid,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'SENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_signatures" ADD CONSTRAINT "human_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_signatures" ADD CONSTRAINT "human_signatures_world_id_verification_id_world_id_verifications_id_fk" FOREIGN KEY ("world_id_verification_id") REFERENCES "public"."world_id_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_id_verifications" ADD CONSTRAINT "world_id_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_signature_id_human_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."human_signatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_signature_id_human_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."human_signatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tool_calls" ADD CONSTRAINT "mcp_tool_calls_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tool_calls" ADD CONSTRAINT "mcp_tool_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_user_id_idx" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "human_signatures_user_id_idx" ON "human_signatures" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "human_signatures_resource_idx" ON "human_signatures" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "human_signatures_action_type_idx" ON "human_signatures" USING btree ("action_type");--> statement-breakpoint
CREATE UNIQUE INDEX "human_signatures_valid_resource_payload_uidx" ON "human_signatures" USING btree ("action_type","resource_type","resource_id","payload_hash") WHERE "human_signatures"."status" = 'VALID';--> statement-breakpoint
CREATE INDEX "world_id_verifications_user_id_idx" ON "world_id_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "world_id_verifications_nullifier_hash_uidx" ON "world_id_verifications" USING btree ("nullifier_hash");--> statement-breakpoint
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_seller_id_idx" ON "listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_category_status_idx" ON "listings" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_listing_id_uidx" ON "orders" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "orders_buyer_id_idx" ON "orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "orders_seller_id_idx" ON "orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_order_id_idx" ON "reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews" USING btree ("reviewee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_submitted_order_reviewer_uidx" ON "reviews" USING btree ("order_id","reviewer_id") WHERE "reviews"."status" = 'SUBMITTED';--> statement-breakpoint
CREATE INDEX "messages_order_id_idx" ON "messages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_id_idx" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_action_logs_user_id_idx" ON "ai_action_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_action_logs_agent_id_idx" ON "ai_action_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "ai_action_logs_resource_idx" ON "ai_action_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "ai_action_logs_created_at_idx" ON "ai_action_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mcp_tool_calls_user_id_idx" ON "mcp_tool_calls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_tool_calls_agent_id_idx" ON "mcp_tool_calls" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "mcp_tool_calls_tool_name_idx" ON "mcp_tool_calls" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "mcp_tool_calls_created_at_idx" ON "mcp_tool_calls" USING btree ("created_at");