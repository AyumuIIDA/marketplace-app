-- +goose Up
-- +goose StatementBegin
-- ソーシャル機能: 商品いいね / 出品者いいね（追加のみ。既存スキーマへ非破壊）。
-- 出品者評価は既存 reviews(reviewee_id, status=SUBMITTED) を集計するため新テーブル不要。
CREATE TABLE "listing_likes" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_likes_pkey" PRIMARY KEY ("user_id", "listing_id"),
	CONSTRAINT "listing_likes_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
	CONSTRAINT "listing_likes_listing_fk" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE
);
CREATE INDEX "listing_likes_listing_idx" ON "listing_likes" ("listing_id");
CREATE INDEX "listing_likes_user_created_idx" ON "listing_likes" ("user_id", "created_at" DESC);

CREATE TABLE "seller_likes" (
	"user_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_likes_pkey" PRIMARY KEY ("user_id", "seller_id"),
	CONSTRAINT "seller_likes_self_chk" CHECK ("user_id" <> "seller_id"),
	CONSTRAINT "seller_likes_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
	CONSTRAINT "seller_likes_seller_fk" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX "seller_likes_seller_idx" ON "seller_likes" ("seller_id");
CREATE INDEX "seller_likes_user_created_idx" ON "seller_likes" ("user_id", "created_at" DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "seller_likes";
DROP TABLE IF EXISTS "listing_likes";
-- +goose StatementEnd
