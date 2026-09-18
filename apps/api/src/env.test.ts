import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { coachResponseSchema } from "@nexora/shared";
import { expect, it, vi } from "vitest";

/**
 * Regression for the .env.example shape. `bun --env-file` turns a bare
 * `HF_TOKEN=` line into an empty string, and an empty string is *present*: a
 * plain `z.string().min(1).optional()` rejected it, so the API died at boot
 * with "Invalid environment: HF_TOKEN, HF_MODEL_ID" instead of honouring the
 * block 04 promise that the jury demo works with no HuggingFace token.
 *
 * Offline like every committed test: ./db is mocked and fetch is a trap.
 */
process.env.HF_TOKEN = "";
process.env.HF_MODEL_ID = "";
process.env.DIRECT_URL = "";

const YOUTH = {
  id: "usr_deniz",
  role: "youth",
  status: "active",
  displayName: "Deniz",
  parentId: "usr_ece",
};
const SCORE = {
  id: "sc_1",
  youthId: YOUTH.id,
  value: 80,
  reasons: ["bir", "iki", "üç"],
  periodStart: new Date("2026-09-08T00:00:00.000Z"),
  periodEnd: new Date("2026-09-15T00:00:00.000Z"),
  computedAt: new Date("2026-09-15T10:05:00.000Z"),
};

vi.mock("./db", () => ({
  prisma: {
    user: { findUnique: async () => YOUTH },
    score: { findFirst: async () => SCORE },
    coachRecommendation: { findFirst: async () => null, create: async () => ({ id: "rec_1" }) },
    task: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "task_1", status: "open", ...data }),
    },
  },
}));

const hfTrap = vi.fn(() => {
  throw new Error("HuggingFace must not be called when HF_TOKEN is empty");
});
vi.stubGlobal("fetch", hfTrap);

const { app } = await import("./index");
const { env } = await import("./env");

it("treats an empty HF_TOKEN as unset and still answers 200 with the canned fallback", async () => {
  expect(env.HF_TOKEN).toBeUndefined();
  expect(env.HF_MODEL_ID).toBeUndefined();
  expect(env.DIRECT_URL).toBeUndefined();

  const login = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona: "deniz" }),
    }),
  );
  const { token } = (await login.json()) as { token: string };

  const res = await app.handle(
    new Request("http://localhost/coach/recommendation", {
      headers: { authorization: `Bearer ${token}` },
    }),
  );

  expect(res.status).toBe(200);
  expect(res.headers.get("x-nexora-coach")).toBe("fallback");
  const body = coachResponseSchema.parse(await res.json());
  expect(body.source).toBe("fallback");
  expect(body.tips).toHaveLength(3);
  expect(hfTrap).not.toHaveBeenCalled();
});

it("keeps the prisma scripts off `bun x`, which drops --env-file variables", () => {
  // `bun --env-file=… x prisma …` loads the file into the bun process but
  // bunx spawns the CLI with the original environment, so migrate died on
  // "Environment variable not found: DIRECT_URL". Running the CLI entry
  // in-process keeps the loaded env.
  const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    scripts: Record<string, string>;
  };

  for (const name of ["db:migrate", "db:generate", "db:status", "db:seed"]) {
    expect(scripts[name]).toContain("--env-file=../../.env");
    expect(scripts[name]).not.toMatch(/\bx\s+prisma\b/);
  }
});

it("refuses to boot when a WEB_ORIGIN entry is not an absolute origin", () => {
  // `WEB_ORIGIN=WEB_ORIGIN=http://localhost:5173` (the key pasted twice) used
  // to parse, and the only symptom was the CORS plugin matching nothing: the
  // API answered 200 with no Access-Control-Allow-Origin and every browser
  // login failed. env.ts promises a loud error instead of a runtime mystery.
  //
  // The read is what throws, not the import: env.ts parses on first access so
  // that Cloudflare can evaluate the module while validating an upload, before
  // any secret exists. On Bun that first access is `app.listen(env.PORT)`, so
  // a misconfigured server still dies before it opens a socket — which is what
  // this touches. A subprocess, because the parse is cached per module.
  const run = (webOrigin: string) =>
    spawnSync(process.execPath, ["-e", 'const { env } = await import("./src/env.ts"); env.PORT;'], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { ...process.env, DATABASE_URL: "x", SESSION_SECRET: "y", WEB_ORIGIN: webOrigin },
      encoding: "utf8",
    });

  const bad = run("WEB_ORIGIN=http://localhost:5173,http://localhost:8081");
  expect(bad.status).not.toBe(0);
  expect(`${bad.stdout}${bad.stderr}`).toContain("Invalid environment: WEB_ORIGIN");

  expect(run("http://localhost:5173,http://localhost:8081").status).toBe(0);
});
