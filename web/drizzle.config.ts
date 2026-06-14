import { defineConfig } from "drizzle-kit";

// auth DB(marketplace_auth)用のdrizzle設定。toolはrootから実行するためpathはroot相対。
// domain(api/drizzle.config.ts)と対称。journalは web/drizzle に出力する。
export default defineConfig({
  schema: "./web/src/db/auth-schema.ts",
  out: "./web/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
