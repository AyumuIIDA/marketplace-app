-- +goose Up
-- +goose StatementBegin
-- 掲示板（2ch風のフラットなスレッド＋レス）。投稿/返信は humanVerified のみ（usecaseで強制）。
-- 著者の display_name / human_verified は users から join して表示（非正規化しない）。
CREATE TABLE "board_posts" (
	"id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	CONSTRAINT "board_posts_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "board_posts_author_fk" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX "board_posts_created_idx" ON "board_posts" ("created_at" DESC);

CREATE TABLE "board_replies" (
	"id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	CONSTRAINT "board_replies_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "board_replies_post_fk" FOREIGN KEY ("post_id") REFERENCES "board_posts" ("id") ON DELETE CASCADE,
	CONSTRAINT "board_replies_author_fk" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX "board_replies_post_created_idx" ON "board_replies" ("post_id", "created_at");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "board_replies";
DROP TABLE IF EXISTS "board_posts";
-- +goose StatementEnd
