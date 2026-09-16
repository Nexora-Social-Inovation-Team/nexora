import { defineConfig } from "vitest/config";

// Only the unit suite: e2e/*.spec.js is Playwright's.
export default defineConfig({ test: { include: ["*.test.js"] } });
