# デプロイ/運用タスク。設定は .env.deploy（gitignore）から読み込む。
#   cp .env.deploy.example .env.deploy で生成し値を埋める。
# 使い方: make help
#
# 前提ツール: cloud-sql-proxy(v2), gcloud, psql(任意), node/npm
# 認証: gcloud auth application-default login（proxy が ADC を使う）

SHELL := /bin/bash
.ONESHELL:

# .env.deploy があれば読み込み、recipe 環境へ export する。
ifneq (,$(wildcard .env.deploy))
include .env.deploy
export
endif

PROXY_PORT ?= 5432

.PHONY: help migrate-domain migrate-auth psql-domain logs-api

help:
	@echo "targets:"
	@echo "  migrate-domain  Cloud SQL(domain) へ drizzle migration（cloud-sql-proxy経由）"
	@echo "  migrate-auth    Neon(auth) へ drizzle migration（直TLS, proxy不要）"
	@echo "  psql-domain     Cloud SQL(domain) へ psql 接続（cloud-sql-proxy経由）"
	@echo "  logs-api        Cloud Run(API) のログ表示"

# cloud-sql-proxy を一時起動 → drizzle migrate → 終了時に proxy 停止。
# @ により recipe 全体を非エコー化（DATABASE_URL中のパスワードを端末に出さない）。
migrate-domain:
	@set -e
	command -v cloud-sql-proxy >/dev/null || { echo "ERROR: cloud-sql-proxy 未導入"; exit 1; }
	test -n "$(CLOUDSQL_INSTANCE)" || { echo "ERROR: CLOUDSQL_INSTANCE 未設定(.env.deploy)"; exit 1; }
	test -n "$$DOMAIN_DB_PASSWORD" || { echo "ERROR: DOMAIN_DB_PASSWORD 未設定(.env.deploy)"; exit 1; }
	echo "[proxy] starting 127.0.0.1:$(PROXY_PORT) -> $(CLOUDSQL_INSTANCE)"
	cloud-sql-proxy "$(CLOUDSQL_INSTANCE)" --port $(PROXY_PORT) &
	PROXY_PID=$$!
	trap 'kill $$PROXY_PID 2>/dev/null' EXIT
	until (exec 3<>/dev/tcp/127.0.0.1/$(PROXY_PORT)) 2>/dev/null; do sleep 0.3; done; exec 3>&-
	echo "[migrate] domain DB ..."
	DATABASE_URL="postgresql://$(DOMAIN_DB_USER):$$DOMAIN_DB_PASSWORD@127.0.0.1:$(PROXY_PORT)/$(DOMAIN_DB_NAME)" npm run db:migrate

# Neon は GCP 外。直 TLS 接続（proxy 対象外）。
migrate-auth:
	@set -e
	test -n "$$AUTH_DATABASE_URL" || { echo "ERROR: AUTH_DATABASE_URL 未設定(.env.deploy)"; exit 1; }
	echo "[migrate] auth DB (Neon) ..."
	DATABASE_URL="$$AUTH_DATABASE_URL" npm run db:auth:migrate

# cloud-sql-proxy 経由で psql。mcp_tool_calls 等の監査確認に使う。
psql-domain:
	@set -e
	command -v cloud-sql-proxy >/dev/null || { echo "ERROR: cloud-sql-proxy 未導入"; exit 1; }
	command -v psql >/dev/null || { echo "ERROR: psql 未導入(postgresql-client)"; exit 1; }
	test -n "$(CLOUDSQL_INSTANCE)" || { echo "ERROR: CLOUDSQL_INSTANCE 未設定(.env.deploy)"; exit 1; }
	cloud-sql-proxy "$(CLOUDSQL_INSTANCE)" --port $(PROXY_PORT) &
	PROXY_PID=$$!
	trap 'kill $$PROXY_PID 2>/dev/null' EXIT
	until (exec 3<>/dev/tcp/127.0.0.1/$(PROXY_PORT)) 2>/dev/null; do sleep 0.3; done; exec 3>&-
	PGPASSWORD="$$DOMAIN_DB_PASSWORD" psql -h 127.0.0.1 -p $(PROXY_PORT) -U $(DOMAIN_DB_USER) -d $(DOMAIN_DB_NAME)

# Cloud Run(API) のログ。アプリの構造化ログはここに出る。
logs-api:
	@set -e
	test -n "$(API_SERVICE)" || { echo "ERROR: API_SERVICE 未設定(.env.deploy)"; exit 1; }
	gcloud run services logs read "$(API_SERVICE)" --region "$(GCP_REGION)" --project "$(GCP_PROJECT)" --limit 100
