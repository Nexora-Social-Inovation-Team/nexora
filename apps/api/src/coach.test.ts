import {
  coachResponseSchema,
  coachSchema,
  taskCompleteResponseSchema,
  weeklyReportSchema,
  type Coach,
  type Persona,
} from "@nexora/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COACH_FALLBACKS, fallbackFor } from "./coach/fallback";

// src/env.ts parses process.env once, at import. These are set before the
// dynamic import below so the model path exists at all; individual tests then
// mutate `env` to simulate an unconfigured jury laptop.
process.env.HF_TOKEN = "hf_test_token";
process.env.HF_MODEL_ID = "Trendyol/Trendyol-LLM-7b-chat-v1.0";

type ScoreRow = {
  id: string;
  youthId: string;
  value: number;
  reasons: string[];
  periodStart: Date;
  periodEnd: Date;
  computedAt: Date;
};
type SummaryRow = { id: string; youthId: string; periodStart: Date; periodEnd: Date; minutes: Record<string, number> };
type TaskRow = {
  id: string;
  youthId: string;
  title: string;
  steps: string[];
  etaMinutes: number;
  status: "open" | "completed";
  badge: string | null;
  completedAt: Date | null;
};
type RecRow = {
  id: string;
  youthId: string;
  tips: string[];
  shareText: string;
  taskId: string | null;
  source: string;
  createdAt: Date;
};

const seedUsers = () =>
  new Map<string, Record<string, unknown>>([
    ["usr_ece", { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", parentId: null }],
    ["usr_mert", { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", parentId: null }],
    ["usr_selin", { id: "usr_selin", role: "admin", status: "active", displayName: "Selin", parentId: null }],
    [
      "usr_deniz",
      { id: "usr_deniz", role: "youth", status: "pending_parent_consent", displayName: "Deniz", parentId: "usr_ece" },
    ],
    [
      "usr_deniz_risky",
      { id: "usr_deniz_risky", role: "youth", status: "active", displayName: "Deniz R", parentId: "usr_ece" },
    ],
    // Nobody's child in this fixture and not in the teacher demo class.
    ["usr_baris", { id: "usr_baris", role: "youth", status: "active", displayName: "Barış", parentId: "usr_x" }],
  ]);

const NOW = new Date("2026-09-16T12:00:00.000Z");

let users = seedUsers();
let scores: ScoreRow[] = [];
let summaries: SummaryRow[] = [];
let tasks: TaskRow[] = [];
let recommendations: RecRow[] = [];

const userFindUnique = vi.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null);

const scoreFindFirst = vi.fn(async ({ where }: { where: { youthId: string; periodStart?: Date } }) =>
  scores
    .filter(
      (row) =>
        row.youthId === where.youthId &&
        (!where.periodStart || row.periodStart.getTime() === where.periodStart.getTime()),
    )
    .sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime())[0] ?? null,
);

const scoreFindMany = vi.fn(async ({ where }: { where: { youthId: string } }) =>
  scores
    .filter((row) => row.youthId === where.youthId)
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime()),
);

const summaryFindFirst = vi.fn(
  async ({ where }: { where: { youthId: string; periodStart: Date; periodEnd: Date } }) =>
    summaries.find(
      (row) =>
        row.youthId === where.youthId &&
        row.periodStart.getTime() === where.periodStart.getTime() &&
        row.periodEnd.getTime() === where.periodEnd.getTime(),
    ) ?? null,
);

const taskCreate = vi.fn(
  async ({ data }: { data: { youthId: string; title: string; steps: string[]; etaMinutes: number } }) => {
    const row: TaskRow = { id: `task_${tasks.length + 1}`, status: "open", badge: null, completedAt: null, ...data };
    tasks.push(row);
    return row;
  },
);

const taskFindUnique = vi.fn(
  async ({ where }: { where: { id: string } }) => tasks.find((row) => row.id === where.id) ?? null,
);

/** Stands in for orderBy id desc: creation order is array order. */
const taskFindFirst = vi.fn(
  async ({ where }: { where: { youthId: string } }) =>
    tasks.filter((row) => row.youthId === where.youthId).at(-1) ?? null,
);

const taskFindMany = vi.fn(
  async ({ where, take }: { where: { youthId: string; status?: string }; take?: number }) =>
    tasks
      .filter((row) => row.youthId === where.youthId && (!where.status || row.status === where.status))
      .slice(0, take ?? tasks.length),
);

const taskUpdate = vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TaskRow> }) =>
  Object.assign(tasks.find((row) => row.id === where.id)!, data),
);

const recFindFirst = vi.fn(async ({ where }: { where: { youthId: string; createdAt?: { gte: Date } } }) =>
  recommendations
    .filter(
      (row) =>
        row.youthId === where.youthId &&
        (!where.createdAt || row.createdAt.getTime() >= where.createdAt.gte.getTime()),
    )
    .at(-1) ?? null,
);

const recCreate = vi.fn(
  async ({ data }: { data: { youthId: string; tips: string[]; shareText: string; taskId: string; source: string } }) => {
    // Fixed clock: the route's "recommendation newer than the score" check must
    // not depend on the machine's wall time.
    const row: RecRow = { id: `rec_${recommendations.length + 1}`, createdAt: NOW, ...data };
    recommendations.push(row);
    return row;
  },
);

const recUpdate = vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<RecRow> }) =>
  Object.assign(recommendations.find((row) => row.id === where.id)!, data),
);

vi.mock("./db", () => ({
  prisma: {
    user: { findUnique: userFindUnique, update: vi.fn() },
    consentEvent: { create: vi.fn() },
    deletionRequest: { create: vi.fn() },
    categorySummary: { upsert: vi.fn(), findFirst: summaryFindFirst },
    score: { deleteMany: vi.fn(), create: vi.fn(), findFirst: scoreFindFirst, findMany: scoreFindMany },
    task: {
      create: taskCreate,
      findUnique: taskFindUnique,
      findFirst: taskFindFirst,
      findMany: taskFindMany,
      update: taskUpdate,
    },
    coachRecommendation: { findFirst: recFindFirst, create: recCreate, update: recUpdate },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    $queryRaw: vi.fn(),
  },
}));

/** The OpenAI-compatible envelope the HuggingFace router returns. */
const hfReply = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const hfFetch = vi.fn(async (_url: string, _init?: RequestInit) => hfReply("Merhaba!"));
vi.stubGlobal("fetch", hfFetch);

const { app } = await import("./index");
const { env } = await import("./env");
const { buildUserPrompt, isSafeCoach } = await import("./coach");

/* ------------------------------------------------------------- fixtures */

const PERIOD_START = new Date("2026-09-08T00:00:00.000Z");
const PERIOD_END = new Date("2026-09-15T00:00:00.000Z");
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
const REASONS = [
  "Eğlence kategorisi sürenin çoğunu kaplıyor.",
  "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
  "Birden fazla değerli kategoride zaman geçirmişsin.",
];

const MODEL_COACH: Coach = {
  tips: [
    "Yarın 15 dakikalık bir bilim molası dene.",
    "Skorunun nedenlerini kendi hedefine bağla.",
    "Kısa bir içerik üret, tüketimi dengeler.",
  ],
  task: {
    title: "Modelin önerdiği kısa görev",
    steps: ["Bir konu seç.", "15 dakika odaklan.", "Bir cümle yaz."],
    eta_minutes: 15,
  },
  share_text: "Bu hafta kısa bir bilim görevi seçildi.",
};

const modelReturns = (payload: unknown) =>
  hfFetch.mockImplementation(async () =>
    hfReply(typeof payload === "string" ? payload : JSON.stringify(payload)),
  );

const givenScore = (
  value = 80,
  youthId = "usr_deniz",
  periodStart = PERIOD_START,
  periodEnd = PERIOD_END,
  computedAt = new Date("2026-09-15T10:05:00.000Z"),
) => {
  scores.push({ id: `sc_${scores.length + 1}`, youthId, value, reasons: REASONS, periodStart, periodEnd, computedAt });
  summaries.push({ id: `sum_${summaries.length + 1}`, youthId, periodStart, periodEnd, minutes: BALANCED });
};

const activate = (id: string) => users.set(id, { ...users.get(id)!, status: "active" });

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

const call = async (persona: Persona, path: string, method = "GET") =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { authorization: `Bearer ${await tokenOf(persona)}` },
    }),
  );

const getCoach = (persona: Persona = "deniz") => call(persona, "/coach/recommendation");
const getReport = (persona: Persona, query = "") => call(persona, `/reports/weekly${query}`);
const completeTask = (persona: Persona, id: string) => call(persona, `/tasks/${id}/complete`, "POST");

beforeEach(() => {
  users = seedUsers();
  scores = [];
  summaries = [];
  tasks = [];
  recommendations = [];
  env.HF_TOKEN = "hf_test_token";
  env.HF_MODEL_ID = "Trendyol/Trendyol-LLM-7b-chat-v1.0";
  // mockClear, not mockReset: reset drops vitest's settled-result tracking.
  for (const spy of [userFindUnique, scoreFindFirst, scoreFindMany, summaryFindFirst, taskCreate, taskFindUnique,
    taskFindFirst, taskFindMany, taskUpdate, recFindFirst, recCreate, recUpdate, hfFetch]) spy.mockClear();
  hfFetch.mockImplementation(async () => hfReply("Tabii! İşte sana birkaç öneri: daha az ekran, daha çok kitap."));
});

/* ----------------------------------------------------- coach: schema gate */

describe("coachSchema (docs/API.md exact shape)", () => {
  const example = {
    tips: [
      "Bu hafta eğlence süren yüksek; yarın 15 dakikalık bir bilim videosu seç.",
      "Skorunun nedenlerini kendin seçtiğin bir hedefe bağla.",
      "Ürettiğin kısa bir içerik, tüketimi dengeler.",
    ],
    task: {
      title: "15 dakikalık bilim molası",
      steps: ["İlgini çeken bir bilim konusunu seç.", "15 dakika boyunca yalnızca o konuya bak."],
      eta_minutes: 15,
    },
    share_text: "Deniz bu hafta kısa bir bilim görevi seçti.",
  };

  it("accepts the API.md example", () => {
    expect(coachSchema.parse(example)).toEqual(example);
  });

  it("rejects 2 tips", () => {
    expect(coachSchema.safeParse({ ...example, tips: example.tips.slice(0, 2) }).success).toBe(false);
  });

  it("rejects eta_minutes 0", () => {
    expect(coachSchema.safeParse({ ...example, task: { ...example.task, eta_minutes: 0 } }).success).toBe(false);
  });
});

/* -------------------------------------------------------- coach: fallback */

describe("canned fallback map", () => {
  it("gives the three score bands three different tasks", () => {
    const titles = [fallbackFor(38), fallbackFor(65), fallbackFor(93)].map((entry) => entry.task.title);

    expect(new Set(titles).size).toBe(3);
    expect(titles[0]).toBe("Kısa bir mola ve bir yetişkinle konuş");
  });

  it("keeps the band edges where docs/building-blocks/04 puts them", () => {
    expect(fallbackFor(49).task.title).toBe(COACH_FALLBACKS.low.task.title);
    expect(fallbackFor(50).task.title).toBe(COACH_FALLBACKS.mid.task.title);
    expect(fallbackFor(79).task.title).toBe(COACH_FALLBACKS.mid.task.title);
    expect(fallbackFor(80).task.title).toBe(COACH_FALLBACKS.high.task.title);
  });

  it("makes every entry pass coachSchema, the policy filter and the no-diagnosis rule", () => {
    for (const entry of Object.values(COACH_FALLBACKS)) {
      expect(coachSchema.safeParse(entry).success).toBe(true);
      expect(isSafeCoach(entry)).toBe(true);
      expect(JSON.stringify(entry).toLocaleLowerCase("tr")).not.toContain("bağımlılık");
    }
  });
});

/* ---------------------------------------------------- coach: prompt builder */

describe("prompt builder", () => {
  it("serializes only the allow-listed fields, so a sneaky url never reaches the model", () => {
    const sneaky = {
      minutes: { science: 40, entertainment: 120, url: "https://youtube.com/watch?v=1" },
      score: { value: 80, reasons: REASONS, hostname: "youtube.com" },
      completed_tasks: [],
      url: "http://example.com/deniz",
      visits: [{ hostname: "instagram.com", path: "/reels" }],
    } as unknown as Parameters<typeof buildUserPrompt>[0];

    const prompt = buildUserPrompt(sneaky);

    expect(prompt.toLowerCase()).not.toContain("http");
    expect(prompt.toLowerCase()).not.toContain("youtube");
    expect(prompt.toLowerCase()).not.toContain("hostname");
    expect(Object.keys(JSON.parse(prompt))).toEqual(["minutes", "score", "completed_tasks"]);
    expect(JSON.parse(prompt)).toMatchObject({ minutes: { science: 40, entertainment: 120 }, score: { value: 80 } });
  });
});

/* ------------------------------------------------- GET /coach/recommendation */

describe("GET /coach/recommendation — access control", () => {
  it("is 403 consent_missing for a youth still waiting for parent consent", async () => {
    const res = await getCoach("deniz");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "consent_missing", message: expect.any(String) } });
  });

  it("is 403 forbidden for parent, teacher and admin", async () => {
    for (const persona of ["ece", "mert", "selin"] as const) {
      const res = await getCoach(persona);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: { code: "forbidden", message: expect.any(String) } });
    }
  });

  it("is 401 without a session", async () => {
    expect((await app.handle(new Request("http://localhost/coach/recommendation"))).status).toBe(401);
  });

  it("is 404 no_data for an active youth with no score yet", async () => {
    activate("usr_deniz");

    const res = await getCoach();

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "no_data", message: expect.any(String) } });
    expect(tasks).toEqual([]);
  });
});

describe("GET /coach/recommendation — model vs fallback", () => {
  beforeEach(() => {
    activate("usr_deniz");
    givenScore(80);
  });

  const expectFallback = async (res: Response) => {
    expect(res.status).toBe(200);
    expect(res.headers.get("x-nexora-coach")).toBe("fallback");
    const body = coachResponseSchema.parse(await res.json());
    expect(body.source).toBe("fallback");
    return body;
  };

  it("falls back when HuggingFace answers prose", async () => {
    const body = await expectFallback(await getCoach());

    expect(body.task.title).toBe(COACH_FALLBACKS.high.task.title);
    expect(tasks).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({ source: "fallback", taskId: body.task_id });
  });

  it("uses the model answer when HuggingFace returns valid JSON", async () => {
    modelReturns(MODEL_COACH);

    const res = await getCoach();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-nexora-coach")).toBe("model");
    const body = coachResponseSchema.parse(await res.json());
    expect(body.source).toBe("model");
    expect(body.tips).toEqual(MODEL_COACH.tips);
    expect(tasks[0]).toMatchObject({ title: MODEL_COACH.task.title, etaMinutes: 15, status: "open" });
  });

  it("accepts valid JSON wrapped in prose or a code fence", async () => {
    modelReturns("İşte JSON:\n```json\n" + JSON.stringify(MODEL_COACH) + "\n```\nKolay gelsin!");

    const body = coachResponseSchema.parse(await (await getCoach()).json());

    expect(body.source).toBe("model");
    expect(body.task.title).toBe(MODEL_COACH.task.title);
  });

  it("falls back when the model shames the youth", async () => {
    modelReturns({ ...MODEL_COACH, share_text: "Deniz telefona bağımlısın, dikkat et." });

    await expectFallback(await getCoach());
  });

  it("falls back when the model writes a diagnosis", async () => {
    modelReturns({ ...MODEL_COACH, tips: ["Bu bir depresyon tanısı değil ama...", ...MODEL_COACH.tips.slice(1)] });

    await expectFallback(await getCoach());
  });

  it("falls back when the model puts an https link in a step", async () => {
    modelReturns({
      ...MODEL_COACH,
      task: { ...MODEL_COACH.task, steps: ["https://ornek.com adresine git.", "15 dakika oku."] },
    });

    await expectFallback(await getCoach());
  });

  it("falls back when the model sends only 2 tips", async () => {
    modelReturns({ ...MODEL_COACH, tips: MODEL_COACH.tips.slice(0, 2) });

    await expectFallback(await getCoach());
  });

  it("falls back when eta_minutes is outside 5-30", async () => {
    modelReturns({ ...MODEL_COACH, task: { ...MODEL_COACH.task, eta_minutes: 0 } });

    await expectFallback(await getCoach());
  });

  it("falls back when HuggingFace is unreachable", async () => {
    hfFetch.mockImplementation(() => Promise.reject(new Error("network down")));

    await expectFallback(await getCoach());
  });

  it("falls back with 200 and never calls HuggingFace when HF_TOKEN is unset", async () => {
    env.HF_TOKEN = undefined;

    const body = await expectFallback(await getCoach());

    expect(hfFetch).not.toHaveBeenCalled();
    expect(body.tips).toEqual(COACH_FALLBACKS.high.tips);
  });

  it("sends no url, hostname or page content to HuggingFace", async () => {
    modelReturns(MODEL_COACH);

    await getCoach();

    const sent = JSON.stringify(hfFetch.mock.calls[0]?.[1] ?? {});
    expect(sent.toLowerCase()).not.toContain("hostname");
    expect(sent).not.toMatch(/https?:\/\/(?!router\.huggingface\.co)/);
  });
});

describe("GET /coach/recommendation — one task per score", () => {
  beforeEach(() => {
    activate("usr_deniz");
    givenScore(38);
  });

  it("returns the same task on a reload instead of stacking a second one", async () => {
    const first = coachResponseSchema.parse(await (await getCoach()).json());
    const second = coachResponseSchema.parse(await (await getCoach()).json());

    expect(second.task_id).toBe(first.task_id);
    expect(tasks).toHaveLength(1);
    expect(recommendations).toHaveLength(1);
  });

  it("lets the model replace an open fallback task in place", async () => {
    const first = coachResponseSchema.parse(await (await getCoach()).json());
    expect(first.source).toBe("fallback");

    modelReturns(MODEL_COACH);
    const second = coachResponseSchema.parse(await (await getCoach()).json());

    expect(second.source).toBe("model");
    expect(second.task_id).toBe(first.task_id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ title: MODEL_COACH.task.title, status: "open" });
    expect(recommendations[0]).toMatchObject({ source: "model" });
  });

  it("never rewrites a task the youth already completed", async () => {
    const first = coachResponseSchema.parse(await (await getCoach()).json());
    await completeTask("deniz", first.task_id);

    modelReturns(MODEL_COACH);
    const second = coachResponseSchema.parse(await (await getCoach()).json());

    expect(second.source).toBe("fallback");
    expect(second.task.title).toBe(first.task.title);
    expect(tasks[0]).toMatchObject({ status: "completed" });
  });

  it("starts a new task once a newer score is computed", async () => {
    const first = coachResponseSchema.parse(await (await getCoach()).json());
    givenScore(93, "usr_deniz", new Date("2026-09-15T00:00:00.000Z"), new Date("2026-09-22T00:00:00.000Z"),
      new Date("2026-09-22T10:00:00.000Z"));

    const second = coachResponseSchema.parse(await (await getCoach()).json());

    expect(second.task_id).not.toBe(first.task_id);
    expect(tasks).toHaveLength(2);
  });
});

/* ------------------------------------------------------ GET /reports/weekly */

/** `title` is legitimate on a report task, so this is not findForbiddenKey. */
const REPORT_FORBIDDEN = ["url", "urls", "hostname", "hostnames", "path", "domain"];
const scanKeys = (value: unknown): string | null => {
  if (Array.isArray(value)) return value.map(scanKeys).find(Boolean) ?? null;
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (REPORT_FORBIDDEN.includes(key.toLowerCase())) return key;
      const hit = scanKeys(child);
      if (hit) return hit;
    }
  }
  return null;
};

describe("GET /reports/weekly", () => {
  it("is 403 consent_missing while the linked youth is still pending", async () => {
    const res = await getReport("ece", "?youthId=usr_deniz");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "consent_missing", message: expect.any(String) } });
  });

  it("is 400 validation_error when a parent omits youthId", async () => {
    expect((await getReport("ece")).status).toBe(400);
  });

  it("is 403 forbidden for a youth that is not the caller's", async () => {
    expect((await getReport("ece", "?youthId=usr_baris")).status).toBe(403);
  });

  it("is 400 validation_error for a malformed week", async () => {
    activate("usr_deniz");
    expect((await getReport("deniz", "?week=2026-09")).status).toBe(400);
  });

  it("returns the empty shape for an active youth with nothing ingested", async () => {
    activate("usr_deniz");

    const res = await getReport("deniz");

    expect(res.status).toBe(200);
    const body = weeklyReportSchema.parse(await res.json());
    expect(body).toEqual({
      youthId: "usr_deniz",
      period: null,
      score: null,
      distribution: {},
      trend: [],
      task: null,
      share_text: null,
      empty: true,
    });
  });

  it("returns the ready shape with all 8 categories, trend, task and share_text", async () => {
    activate("usr_deniz");
    givenScore(80);
    await getCoach();

    const res = await getReport("ece", "?youthId=usr_deniz");

    expect(res.status).toBe(200);
    const body = weeklyReportSchema.parse(await res.json());
    expect(body.empty).toBe(false);
    if (body.empty) throw new Error("expected a ready report");
    expect(body.period).toBe(PERIOD);
    expect(body.score).toEqual({ value: 80, reasons: REASONS });
    expect(Object.keys(body.distribution).sort()).toEqual(Object.keys(BALANCED).sort());
    expect(body.distribution).toEqual(BALANCED);
    expect(body.trend).toEqual([{ period: PERIOD, value: 80 }]);
    expect(body.task).toEqual({ id: tasks[0]!.id, title: COACH_FALLBACKS.high.task.title, status: "open" });
    expect(body.share_text).toBe(COACH_FALLBACKS.high.share_text);
  });

  it("carries no url, hostname, path or domain key at any depth", async () => {
    activate("usr_deniz");
    givenScore(80);
    await getCoach();

    const body = await (await getReport("mert", "?youthId=usr_deniz")).json();

    expect(scanKeys(body)).toBeNull();
  });

  it("keeps the last 4 periods of the trend, ascending", async () => {
    activate("usr_deniz");
    for (let week = 0; week < 5; week += 1) {
      const start = new Date(Date.UTC(2026, 7, 4 + week * 7));
      const end = new Date(Date.UTC(2026, 7, 11 + week * 7));
      givenScore(50 + week, "usr_deniz", start, end, new Date(end.getTime() + 3600_000));
    }

    const body = weeklyReportSchema.parse(await (await getReport("selin", "?youthId=usr_deniz")).json());
    if (body.empty) throw new Error("expected a ready report");

    expect(body.trend.map((point) => point.value)).toEqual([51, 52, 53, 54]);
    expect(body.trend).toHaveLength(4);
    expect(body.period).toBe("2026-09-01/2026-09-08");
  });

  it("selects the asked-for week instead of the latest", async () => {
    activate("usr_deniz");
    givenScore(80);
    givenScore(93, "usr_deniz", new Date("2026-09-15T00:00:00.000Z"), new Date("2026-09-22T00:00:00.000Z"),
      new Date("2026-09-22T10:00:00.000Z"));

    const body = weeklyReportSchema.parse(await (await getReport("deniz", "?week=2026-09-08")).json());
    if (body.empty) throw new Error("expected a ready report");

    expect(body.period).toBe(PERIOD);
    expect(body.score.value).toBe(80);
  });
});

/* ---------------------------------------------------- POST /tasks/:id/complete */

describe("POST /tasks/:id/complete", () => {
  beforeEach(() => {
    activate("usr_deniz");
    givenScore(80);
  });

  it("completes the coach task and flips the report to completed", async () => {
    const coach = coachResponseSchema.parse(await (await getCoach()).json());

    const res = await completeTask("deniz", coach.task_id);

    expect(res.status).toBe(200);
    const body = taskCompleteResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ id: coach.task_id, status: "completed", badge: "degerli_adim" });

    const report = weeklyReportSchema.parse(await (await getReport("ece", "?youthId=usr_deniz")).json());
    if (report.empty) throw new Error("expected a ready report");
    expect(report.task).toEqual({ id: coach.task_id, title: coach.task.title, status: "completed" });
  });

  it("is idempotent", async () => {
    const coach = coachResponseSchema.parse(await (await getCoach()).json());

    const first = await (await completeTask("deniz", coach.task_id)).json();
    const second = await (await completeTask("deniz", coach.task_id)).json();

    expect(second).toEqual(first);
    expect(taskUpdate).toHaveBeenCalledTimes(1);
  });

  it("is 404 no_data for an unknown id", async () => {
    const res = await completeTask("deniz", "task_does_not_exist");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "no_data", message: expect.any(String) } });
  });

  it("is 404 no_data for another youth's task", async () => {
    const coach = coachResponseSchema.parse(await (await getCoach()).json());

    expect((await completeTask("deniz_risky", coach.task_id)).status).toBe(404);
    expect(tasks[0]).toMatchObject({ status: "open" });
  });

  it("is 403 for a parent and for a youth without consent", async () => {
    const coach = coachResponseSchema.parse(await (await getCoach()).json());
    expect((await completeTask("ece", coach.task_id)).status).toBe(403);

    users.set("usr_deniz", { ...users.get("usr_deniz")!, status: "revoked" });
    expect((await completeTask("deniz", coach.task_id)).status).toBe(403);
  });
});
