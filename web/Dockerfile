# web(Next.js: front + BFF) ローカル開発イメージ。
# build context は【リポジトリroot】。web/tsconfig が ../tsconfig.json を継承するため、
# コンテナ内に root tsconfig を存在させる必要がある（apiと対称: 全リポジトリを /app に置く）。
# next dev でホットリロード。drizzle-kit/drizzle-orm は auth schema の型検査/著者用(devDep)。
# 本番(Vercel)向けには next build/next start を用いる想定。
FROM node:22-bookworm-slim

# webパッケージのルートで動作（next の cwd）。
WORKDIR /app/web

# web依存を先に解決してレイヤをキャッシュ。lockずれ許容のため npm install（本番は npm ci 推奨）。
COPY web/package.json web/package-lock.json* ./
RUN npm install

# 全リポジトリを /app へ。root tsconfig.json と web/ ソースが入る（node_modules等は .dockerignore で除外）。
COPY . /app

EXPOSE 3000

# 0.0.0.0 bind でホストからのアクセスを許可する。
CMD ["sh", "-c", "npm run dev -- -H 0.0.0.0 -p 3000"]
