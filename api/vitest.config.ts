import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "./api",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
