-- +goose Up
-- +goose StatementBegin
-- 出品コメント（Instagram風カードの公開コメント）。投稿は人間性検証済みユーザーのみ（usecaseで強制）。
-- 著者の display_name / human_verified は users から join して表示する（非正規化しない）。
CREATE TABLE "listing_comments" (
	"id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	CONSTRAINT "listing_comments_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "listing_comments_listing_fk" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE,
	CONSTRAINT "listing_comments_author_fk" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX "listing_comments_listing_created_idx" ON "listing_comments" ("listing_id", "created_at" DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "listing_comments";
-- +goose StatementEnd
