#!/bin/sh
# ワンショット migrate（auth DBのみ）。db healthy 後に marketplace_auth へ drizzle migration を適用する。
# domain DB(marketplace_domain) は api-go の goose(migrate-domain サービス) が単一管理する。
# 失敗時は非0で終了し、依存する web の起動をブロックする（fail-closed）。
set -e

echo "[migrate-auth] auth (marketplace_auth) ..."
DATABASE_URL="$AUTH_DATABASE_URL" npx drizzle-kit migrate --config=web/drizzle.config.ts

echo "[migrate-auth] completed."
