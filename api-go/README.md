# api-go（**API 正本 / デプロイ対象**）

既存 TypeScript backend（`../api`, Hono + Drizzle + Zod）を Go へ完全移植したもの。**本番/ローカルとも本ディレクトリが正本**。
DDD / Onion / modular-monolith を維持し、同一DB・同一RESTパス・同一JSON契約（status/error.code/項目名）でフロント無改修。

- ローカル: `docker-compose.yml` の `api` サービスは本ディレクトリをビルド（distroless非root）。
- 本番: `.github/workflows/deploy-api.yml` が `api-go/Dockerfile` をビルドし同一 Cloud Run サービスへデプロイ（Go test がゲート）。
- `../api`（TS）はソース保全のため残置するが、ビルド/デプロイ経路からは外れた。

規約: `../docs/go-coding-style-chatgpt.md` を正本とする。

## スタック

chi / pgx-v5 / sqlc / goose / go-playground-validator / golang-jwt-v5 / slog。Go 1.25。

## ローカル実行

```sh
# 既存composeのDBを使う（marketplace_domain は drizzle で作成済み）
DATABASE_URL='postgres://app:app@localhost:5432/marketplace_domain' \
BFF_ALLOW_DEV_USER_HEADER=true \
go run ./cmd/server          # 既存TS apiが8080なので PORT=8090 等で起動

curl localhost:8090/healthz                       # {"status":"ok"}
curl -H 'x-user-id: <uuid>' localhost:8090/me     # dev認証で現在ユーザー
```

本番(Cloud Run)は BFF 発行の EdDSA JWT を `Authorization: Bearer` で受ける。
`BFF_INTERNAL_JWT_PUBLIC_KEY`（OKP/Ed25519 JWK, 公開鍵のみ）を設定すること。

## マイグレーション

**domain DB(`marketplace_domain`) は goose が単一管理**（drizzleからGoへ統一済み）。
ローカルは compose の `migrate-domain` サービスが `up` を実行する（`api` はその完了を待つ）。
auth DB(`marketplace_auth`) は Auth.js 専用のため `migrate-auth`(web/drizzle) が引き続き管理する。

```sh
DATABASE_URL=... go run ./cmd/migrate up        # 新規DB: baseline(00001)+social(00002) を一括適用
DATABASE_URL=... go run ./cmd/migrate status
DATABASE_URL=... go run ./cmd/migrate stamp 1   # 既存DB採用: baselineを「適用済み」と記録(DDL不実行)
```

`internal/db/migrations/00001_baseline.sql` は `../api/drizzle/0000..0003` 適用後の最終状態と等価。
**別系統(drizzle)で同等スキーマを作成済みの既存DB**には baseline を流さず、`stamp 1` で採用してから
差分(`00002`〜)を `up` で適用する（Flyway baseline / Liquibase changelogSync 相当）。
新規DB(Cloud SQL / `compose down -v` 後)は `up` だけで baseline から再現する。

## コード生成 / 検証

```sh
sqlc generate     # internal/db/queries/*.sql + migrations から型安全コード生成
go build ./... && go vet ./... && go test ./...
golangci-lint run # depguard で層/モジュール境界を機械チェック（.golangci.yml）
```

## 移植状況

| Inc | 範囲 | 状態 |
|-----|------|------|
| 0 | skeleton（config/health/Docker/lint） | ✅ |
| 1 | DB基盤（goose/sqlc/pgx/shared/tx-runner） | ✅ |
| 2 | identity + 認証middleware（GET/PUT /me） | ✅ |
| 3 | listings（create/search/get/draft更新/hide/画像upload） | ✅ |
| 4 | orders + purchase workflow（跨moduleTx）/ ship / receive | ✅ |
| 5 | messages（注文単位DM send/list workflow + hide） | ✅ |
| 6 | signatures（World ID検証 / JWS署名 / publish・update workflow / `/me/world-id`） | ✅ |
| 7 | reviews（公開GET / create workflow / submit署名workflow→注文完了） | ✅ |
| 8 | ai-assistance（Gemini/Vertex AI + 決定論fallback / `POST /ai-assistance/listing-fields`） | ✅ |
| 9 | agents（create/list/disable）+ mcpaudit（tool call記録） | ✅ |
| 10 | MCP（`/mcp` transport + 19 tools + 監査記録 + compare workflow） | ✅ |
| 11 | parity / deploy（Docker・CloudRun・goose・CI） | ✅ |

`/mcp` は streamable HTTP（modelcontextprotocol/go-sdk）、認証必須。全tool呼び出しを mcp_tool_calls へ監査記録（idKitResult等はredact）。

AI既定は決定論fake（`AI_ASSISTANT_PROVIDER`）。Gemini指定時はVertex AI（ADC認証・構造化JSON・画像同梱）。
画像取得は errgroup 並列（§16の独立I/O fan-out）。compare/suggest-* はMCP用に実装済（Inc10で配線）。

`GET /reviews` は認証不要（公開）。submit は双方レビュー成立で注文を COMPLETED に遷移。

署名は2フェーズ（Phase1 World ID検証=tx外 → Phase2 署名作成・永続化・状態変更=tx内）。
`POST /me/world-id`（Inc2から遅延）も実装済み。`/me/world-id`・publish・update を配線確認。

境界は `golangci-lint`(depguard: domain-pure / workflow-no-infra / peer-isolation) でCI強制。

跨moduleの購入は `app/workflows`（pure）+ `app/txrunner`（tx境界実体）で分離。
workflow と全 domain は pgx/infra に**依存しない**（依存グラフで検証済み）。

検索は7フィルタ有界のため sqlc nullable-arg のみで実装（Query Builder不使用）。
エラーは TS 契約準拠の code/status（`NOT_FOUND`/`NOT_AUTHENTICATED`/`NOT_AUTHORIZED`/`VALIDATION_FAILED`/domain固有）。

## API契約 parity（vs `../api`）

既存 TS api の**全RESTパスをカバー**（status code・error.code・JSON項目名・201/200 を維持）:
identity(`/me`×3) / listings(create・images・search・get・draft・update・publish・hide・purchase) /
orders(list・get・ship・receive) / messages(`/orders/:id/messages`・`/messages/:id/hide`) /
reviews(公開GET・create・submit) / ai(`/ai-assistance/listing-fields`) / `/mcp`(全tool)。

**未移植（既知ギャップ）**:
- `POST /agents/runs`（discover agent 実行）: AIプランナー/レスポンダーという追加AI components 依存のため未実装。
  MCP本体（server+tools+監査）は完成済で、これはその上の内部エージェントループ。

`api/` は不変。api-go が全機能を満たすまで本番トラフィックは TS 側が処理する。

> 注: `internal/modules/recommendation` と `/search`・`/similar`・`/like`・`/me/liked-*`、
> および goose `00002_social.sql` は別途追加された機能（TS api には無い）。本移植のparity対象外。

## デプロイ（Cloud Run + Cloud SQL）

```sh
# 1) イメージビルド（multi-stage / distroless非root / server+migrate 同梱, ~75MB）
docker build -f Dockerfile -t REGION-docker.pkg.dev/PROJECT/REPO/marketplace-apigo:TAG .

# 2) スキーマ適用（新規Cloud SQL）。webプロセスとは分離した migrate バイナリで実行。
#    既存 marketplace_domain（drizzleで作成済）には流さず version stamp 運用。
DATABASE_URL=... /app/migrate up

# 3) Cloud Run へデプロイ（$PORT で listen, /healthz でヘルスチェック, 非root）
#    runtime secret は Secret Manager（BFF_INTERNAL_JWT_PUBLIC_KEY / HUMAN_SIGNATURE_JWS_SECRET 等）。
```

必須 env: `DATABASE_URL`。認証: `BFF_INTERNAL_JWT_PUBLIC_KEY`(EdDSA JWK)。
署名: `HUMAN_SIGNATURE_JWS_SECRET` / `WORLD_ID_RP_ID`。AI: `AI_ASSISTANT_PROVIDER`(既定deterministic)。
未設定の基盤は**縮退起動**（該当ルートのみ500、他機能は稼働）。

CI: `.github/workflows/ci.yml` の `api-go` ジョブが build/vet/test/golangci-lint と
`sqlc generate` 差分ゼロを検証する。
