# api(Hono) ローカル開発イメージ。
# root依存(tsx/drizzle-kit/pg/jose/openai等)をインストールし、tsx watchでホットリロード起動する。
# 同イメージを migrate ワンショットサービスでも再利用する（drizzle-kit同梱のため）。
# 本番(Cloud Run)向けには別途 multi-stage で node build/server.js を起動する想定。
FROM node:22-bookworm-slim

WORKDIR /app

# 依存解決を先に行いレイヤをキャッシュ。lockずれ許容のため npm install（本番は npm ci 推奨）。
COPY package.json package-lock.json* ./
RUN npm install

# 初期ソース投入。実行時は compose の bind mount で上書きされる（node_modulesは匿名volumeで保護）。
COPY . .

EXPOSE 8080

CMD ["npx", "tsx", "watch", "api/src/server.ts"]
