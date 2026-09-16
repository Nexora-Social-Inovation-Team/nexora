import { findForbiddenKey, type Persona } from "@nexora/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Block 02 seed plus an unrelated youth, in memory: no DATABASE_URL needed. */
const seedUsers = () =>
  new Map<string, Record<string, unknown>>([
    ["usr_ece", { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", parentId: null }],
    ["usr_mert", { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", parentId: null }],
    ["usr_selin", { id: "usr_selin", role: "admin", status: "active", displayName: "Selin", parentId: null }],
    [
      "usr_deniz",
      {
        id: "usr_deniz",
        role: "youth",
        status: "pending_parent_consent",
        displayName: "Deniz",
        parentId: "usr_ece",
      },
    ],
    // Not Ece's child and not in the teacher demo class.
    ["usr_baris", { id: "usr_baris", role: "youth", status: "active", displayName: "Barış", parentId: "usr_x" }],
  ]);

let users = seedUsers();
type Row = Record<string, unknown>;
let summaries: Row[] = [];
let scores: Row[] = [];

const findUnique = vi.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null);

const periodKey = (row: Row) =>
  `${row.youthId}|${(row.periodStart as Date).toISOString()}|${(row.periodEnd as Date).toISOString()}`;

const summaryUpsert = vi.fn(
  async ({
    where,
    create,
    update,
  }: {
    where: { youthId_periodStart_periodEnd: Row };
    create: Row;
    update: Row;
  }) => {
    const key = periodKey(where.youthId_periodStart_periodEnd);
    const existing = summaries.find((row) => periodKey(row) === key);
    if (existing) return Object.assign(existing, update);
    const row = { id: `sum_${summaries.length + 1}`, ...create };
    summaries.push(row);
    return row;
  },
);

const scoreDeleteMany = vi.fn(async ({ where }: { where: Row }) => {
  const key = periodKey(where);
  const kept = scores.filter((row) => periodKey(row) !== key);
  const count = scores.length - kept.length;
  scores = kept;
  return { count };
});

const scoreCreate = vi.fn(async ({ data }: { data: Row }) => {
  const row = { id: `sc_${scores.length + 1}`, computedAt: new Date("2026-09-15T10:05:00.000Z"), ...data };
  scores.push(row);
  return row;
});

/** Stands in for findFirst + orderBy computedAt desc: last write wins. */
const scoreFindFirst = vi.fn(async ({ where }: { where: { youthId: string } }) =>
  scores.filter((row) => row.youthId === where.youthId).at(-1) ?? null,
);

vi.mock("./db", () => ({
  prisma: {
    user: { findUnique, update: vi.fn() },
    consentEvent: { create: vi.fn() },
    deletionRequest: { create: vi.fn() },
    categorySummary: { upsert: summaryUpsert },
    score: { deleteMany: scoreDeleteMany, create: scoreCreate, findFirst: scoreFindFirst },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    $queryRaw: vi.fn(),
  },
}));

const { app } = await import("./index");

const PERIOD = "2026-09-08/2026-09-15";
const BALANCED = {
  science: 40,
  arts: 15,
  sports: 20,
  culture: 10,
  entrepreneurship: 0,
  national_memory: 5,
  entertainment: 120,
  harmful: 0,
};
const DOCS_REASONS = [
  "Eğlence kategorisi sürenin çoğunu kaplıyor.",
  "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
  "Birden fazla değerli kategoride zaman geçirmişsin.",
];

const tokenOf = async (persona: Persona) => {
  const res = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona }),
    }),
  );
  return ((await res.json()) as { token: string }).token;
};

const postSignals = async (persona: Persona, body: unknown) =>
  app.handle(
    new Request("http://localhost/signals/category-summary", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${await tokenOf(persona)}` },
      body: JSON.stringify(body),
    }),
  );

const getScore = async (persona: Persona, query = "") =>
  app.handle(
    new Request(`http://localhost/score/current${query}`, {
      headers: { authorization: `Bearer ${await tokenOf(persona)}` },
    }),
  );

const activate = (id: string) => users.set(id, { ...users.get(id)!, status: "active" });

beforeEach(() => {
  users = seedUsers();
  summaries = [];
  scores = [];
  // mockClear, not mockReset: reset drops vitest's settled-result tracking.
  for (const spy of [findUnique, summaryUpsert, scoreDeleteMany, scoreCreate, scoreFindFirst]) spy.mockClear();
});

describe("POST /signals/category-summary — consent gate", () => {
  it("refuses a youth still waiting for parent consent with 403 consent_missing", async () => {
    const res = await postSignals("deniz", { period: PERIOD, minutes: BALANCED });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "consent_missing", message: expect.any(String) } });
    expect(summaries).toEqual([]);
    expect(scores).toEqual([]);
  });

  it("refuses a parent posting signals with 403 forbidden", async () => {
    const res = await postSignals("ece", { period: PERIOD, minutes: BALANCED });

    expect(res.status).toBe(403);
    expect(summaries).toEqual([]);
  });

  it("is 401 without a session", async () => {
    const res = await app.handle(
      new Request("http://localhost/signals/category-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period: PERIOD, minutes: BALANCED }),
      }),
    );

    expect(res.status).toBe(401);
  });
});

describe("POST /signals/category-summary — privacy and validation", () => {
  beforeEach(() => activate("usr_deniz"));

  const expect400 = async (body: unknown) => {
    const res = await postSignals("deniz", body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: "validation_error", message: expect.any(String) } });
    expect(summaries).toEqual([]);
  };

  it("rejects a top-level url key", async () => {
    await expect400({ minutes: { science: 10 }, url: "https://x" });
  });

  it("rejects a hostname nested at any depth", async () => {
    await expect400({ period: PERIOD, minutes: BALANCED, meta: { visits: [{ hostname: "youtube.com" }] } });
  });

  it("rejects a title key", async () => {
    await expect400({ period: PERIOD, minutes: BALANCED, title: "Watch this" });
  });

  it("rejects an unknown minute key", async () => {
    await expect400({ period: PERIOD, minutes: { gaming: 10 } });
  });

  it("rejects negative minutes", async () => {
    await expect400({ period: PERIOD, minutes: { science: -1 } });
  });

  it("rejects a malformed period", async () => {
    await expect400({ period: "2026-09-08", minutes: BALANCED });
  });

  it("rejects a period whose start is after its end", async () => {
    await expect400({ period: "2026-09-15/2026-09-08", minutes: BALANCED });
  });

  it("is 404 no_data for an all-zero week and writes nothing", async () => {
    const res = await postSignals("deniz", { period: PERIOD, minutes: { science: 0, entertainment: 0 } });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "no_data", message: expect.any(String) } });
    expect(summaries).toEqual([]);
    expect(scores).toEqual([]);
  });
});

describe("POST /signals/category-summary → GET /score/current", () => {
  beforeEach(() => activate("usr_deniz"));

  it("ingests the balanced week as 201 with score 80 and the docs reasons", async () => {
    const res = await postSignals("deniz", { period: PERIOD, minutes: BALANCED });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      period: PERIOD,
      minutes: BALANCED,
      score: { value: 80, reasons: DOCS_REASONS },
    });
  });

  it("gives the youth back the same score it just stored", async () => {
    await postSignals("deniz", { period: PERIOD, minutes: BALANCED });
    const res = await getScore("deniz");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      youthId: "usr_deniz",
      value: 80,
      reasons: DOCS_REASONS,
      computedAt: "2026-09-15T10:05:00.000Z",
      period: PERIOD,
    });
  });

  it("replaces the score instead of stacking duplicates when a period is re-ingested", async () => {
    await postSignals("deniz", { period: PERIOD, minutes: BALANCED });
    await postSignals("deniz", { period: PERIOD, minutes: { science: 70, arts: 20, sports: 20, culture: 15, entertainment: 40 } });

    expect(summaries).toHaveLength(1);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ value: 93 });
  });

  it("persists nothing that looks like a URL, hostname or page content", async () => {
    await postSignals("deniz", { period: PERIOD, minutes: BALANCED });

    expect(findForbiddenKey(summaries)).toBeNull();
    expect(findForbiddenKey(scores)).toBeNull();
  });
});

describe("GET /score/current — access control", () => {
  it("refuses a youth still waiting for parent consent with 403 consent_missing", async () => {
    const res = await getScore("deniz");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "consent_missing", message: expect.any(String) } });
  });

  it("is 404 no_data for an active youth with no summary yet", async () => {
    activate("usr_deniz");
    const res = await getScore("deniz");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "no_data", message: expect.any(String) } });
  });

  it("refuses a parent that did not pass youthId with 400 validation_error", async () => {
    const res = await getScore("ece");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: "validation_error", message: expect.any(String) } });
  });

  it("refuses a parent asking for a youth that is not theirs with 403 forbidden", async () => {
    const res = await getScore("ece", "?youthId=usr_baris");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "forbidden", message: expect.any(String) } });
  });

  it("refuses a parent whose linked youth is still pending with 403 consent_missing", async () => {
    const res = await getScore("ece", "?youthId=usr_deniz");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "consent_missing", message: expect.any(String) } });
  });

  it("lets the linked parent read the active youth's score", async () => {
    activate("usr_deniz");
    await postSignals("deniz", { period: PERIOD, minutes: BALANCED });

    const res = await getScore("ece", "?youthId=usr_deniz");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ youthId: "usr_deniz", value: 80, reasons: DOCS_REASONS });
  });

  it("lets the teacher read a demo-class youth and the admin read anyone", async () => {
    activate("usr_deniz");
    await postSignals("deniz", { period: PERIOD, minutes: BALANCED });

    expect((await getScore("mert", "?youthId=usr_deniz")).status).toBe(200);
    expect((await getScore("selin", "?youthId=usr_deniz")).status).toBe(200);
  });

  it("refuses a youth asking for somebody else with 403 forbidden", async () => {
    activate("usr_deniz");
    const res = await getScore("deniz", "?youthId=usr_baris");

    expect(res.status).toBe(403);
  });
});
