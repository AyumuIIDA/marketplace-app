-- +goose Up
-- +goose StatementBegin
-- 商品の保存（私的ウォッチリスト）。公開シグナルの「いいね」とは別レイヤーで、World ID 認証は不要
-- （全ログインユーザーが利用可）。ランキング/評判には影響しない私的ブックマーク。
CREATE TABLE "listing_saves" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_saves_pkey" PRIMARY KEY ("user_id", "listing_id"),
	CONSTRAINT "listing_saves_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
	CONSTRAINT "listing_saves_listing_fk" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE
);
CREATE INDEX "listing_saves_user_created_idx" ON "listing_saves" ("user_id", "created_at" DESC);

-- 出品者のフォロー（私的）。認証不要。自己フォローはCHECKで防止。
CREATE TABLE "seller_follows" (
	"follower_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_follows_pkey" PRIMARY KEY ("follower_id", "seller_id"),
	CONSTRAINT "seller_follows_self_chk" CHECK ("follower_id" <> "seller_id"),
	CONSTRAINT "seller_follows_follower_fk" FOREIGN KEY ("follower_id") REFERENCES "users" ("id") ON DELETE CASCADE,
	CONSTRAINT "seller_follows_seller_fk" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX "seller_follows_follower_created_idx" ON "seller_follows" ("follower_id", "created_at" DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "seller_follows";
DROP TABLE IF EXISTS "listing_saves";
-- +goose StatementEnd
