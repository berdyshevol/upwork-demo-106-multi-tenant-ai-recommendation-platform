import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Hermetic E2E config: starts the app with NO Supabase env (so it uses the
 * in-repo seed fallback) and deterministic embeddings. AI paths are driven by a
 * mock LLM keyed off the `sk-mock-` BYOK sentinel, so the whole suite runs
 * offline and deterministically.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      BYOK_COOKIE_SECRET: "dGVzdC1zZWNyZXQtMzJieXRlcy1sb25nLXh4eHh4eHg=",
      EMBEDDINGS_PROVIDER: "deterministic",
      NODE_ENV: "development",
    },
  },
});
