import { readFileSync } from "node:fs";
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
