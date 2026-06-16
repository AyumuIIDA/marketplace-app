import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
    env: {
      E2E_TEST_MODE: "1",
      NEXT_PUBLIC_WORLD_ID_APP_ID: "app_e2e_test",
      NEXT_PUBLIC_APP_BASE_URL: "http://127.0.0.1:3101",
      NEXT_PUBLIC_WORLDCOIN_RECEIVER_ADDRESS: "0x0000000000000000000000000000000000000001",
      NEXT_PUBLIC_WLD_JPY_RATE: "300",
      WORLD_DEVELOPER_PORTAL_API_KEY: "e2e-worldcoin-api-key",
      WORLDCOIN_PAYMENT_CONFIRM_BASE_URL: "http://127.0.0.1:3102/api/v2/minikit",
      WORLDCOIN_PAYMENT_PURCHASE_BASE_URL: "http://127.0.0.1:3102/api/bff",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:3101/e2e/worldcoin-payment",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
