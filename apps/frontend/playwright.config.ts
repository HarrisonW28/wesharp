import { defineConfig, devices } from "@playwright/test";

const baseURL =
  /** Base URL where the Next.js app is served (`next dev` or `next start`). */
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const startUiServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== "1";

/**
 * Clerk-backed UI flows stay opt-in until we commit test users +
 * deterministic sign-in helpers. API coverage for the MVP path lives in Laravel
 * PHPUnit (`apps/backend`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  webServer: startUiServer
    ? {
        /** Next.js dev server; skipped when PLAYWRIGHT_NO_WEBSERVER=1 (bring your own `next dev`). */
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "pipe",
      }
    : undefined,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
