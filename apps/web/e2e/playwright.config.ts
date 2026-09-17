import { defineConfig, devices } from "@playwright/test";

/**
 * The DB-backed demo suite. Separate from ../playwright.config.ts on purpose:
 * that one mocks every call with `page.route` and promises it never needs a
 * live API, and `webServer` is config-scoped, so a projects split there would
 * boot Neon for the mocked suite too.
 *
 * Run it with `bun run demo:e2e` from the repo root — the DB must be on slide 1
 * (`db:seed`), because the test is the jury path: Deniz is still pending.
 */
export default defineConfig({
  // testDir defaults to this directory, so ../tests stays invisible here.
  reporter: [["list"]],
  // One test that logs in, approves, ingests, calls the coach and completes a
  // task against Neon; the coach alone may wait up to 20s on HuggingFace.
  timeout: 90_000,
  use: { baseURL: "http://localhost:5173", trace: "off" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: [
    {
      // The plain entry, not `dev`: --watch leaves a child alive on Windows
      // when Playwright kills the parent. /health is 503 until Neon answers.
      command: "bun --env-file=../../.env src/index.ts",
      cwd: "../../api",
      url: "http://localhost:3000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "bun run dev",
      cwd: "..",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
