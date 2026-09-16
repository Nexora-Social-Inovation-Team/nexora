import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests never read the real .env: src/env.ts only needs these to parse.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      SESSION_SECRET: "test-session-secret",
      WEB_ORIGIN: "http://localhost:5173,http://localhost:8081",
    },
  },
});
