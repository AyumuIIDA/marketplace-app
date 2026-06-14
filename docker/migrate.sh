#!/bin/sh
# ワンショット migrate。db healthy 後に domain/auth 両DBへ drizzle migration を適用する。
# 失敗時は非0で終了し、依存する api/web の起動をブロックする（fail-closed）。
# 全環境で同一の仕組み（drizzle-kit migrate）を使い、接続文字列のみ差し替える。
set -e

echo "[migrate] domain (marketplace_domain) ..."
DATABASE_URL="$DOMAIN_DATABASE_URL" npx drizzle-kit migrate --config=api/drizzle.config.ts

echo "[migrate] auth (marketplace_auth) ..."
DATABASE_URL="$AUTH_DATABASE_URL" npx drizzle-kit migrate --config=web/drizzle.config.ts

echo "[migrate] completed."
