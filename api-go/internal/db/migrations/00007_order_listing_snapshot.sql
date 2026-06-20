-- +goose Up
-- +goose StatementBegin
-- 注文に「購入時点の商品スナップショット」を焼き付ける。price/currency と同じ方針で、
-- 取引記録を live listing から独立させる。購入後の SOLD ゲート(403)・編集・削除に影響されず、
-- 買い手が取引状況から「何を買ったか」を常に見られるようにする。
-- 既存行は空文字（フロントは従来どおり no photo / 汎用ラベルにフォールバック）。
ALTER TABLE "orders"
	ADD COLUMN "listing_title" text NOT NULL DEFAULT '',
	ADD COLUMN "listing_image_url" text NOT NULL DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE "orders"
	DROP COLUMN "listing_image_url",
	DROP COLUMN "listing_title";
-- +goose StatementEnd
