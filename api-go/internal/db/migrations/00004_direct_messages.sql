-- +goose Up
-- +goose StatementBegin
-- ユーザー間DM（注文に紐づかない）。会話は (sender,recipient) ペアから導出する単一テーブル。
-- 送受信はログインユーザーなら誰でも可（usecaseで本人確認は要求しない）。
-- status は既存 message_status ENUM を再利用（SENT/HIDDEN）。read_at で既読管理。
CREATE TABLE "direct_messages" (
	"id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'SENT' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "direct_messages_sender_recipient_distinct_chk" CHECK ("sender_id" <> "recipient_id"),
	CONSTRAINT "direct_messages_sender_fk" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE CASCADE,
	CONSTRAINT "direct_messages_recipient_fk" FOREIGN KEY ("recipient_id") REFERENCES "users" ("id") ON DELETE CASCADE
);
-- スレッド取得（ペア×時系列）と受信箱（recipient×新着）の両方向に効く索引。
CREATE INDEX "direct_messages_pair_idx" ON "direct_messages" ("sender_id", "recipient_id", "created_at" DESC);
CREATE INDEX "direct_messages_inbox_idx" ON "direct_messages" ("recipient_id", "created_at" DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "direct_messages";
-- +goose StatementEnd
