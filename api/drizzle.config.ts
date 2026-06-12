import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./api/src/db/schema/index.ts",
  out: "./api/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
