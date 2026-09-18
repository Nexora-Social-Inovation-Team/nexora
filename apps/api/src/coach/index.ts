import {
  CATEGORY_IDS,
  type CategoryMinutes,
  type Coach,
  type CoachResponse,
  coachSchema,
} from "@nexora/shared";
import { Elysia } from "elysia";
import { requireActiveYouth, requireUser } from "../auth";
import { prisma } from "../db";
import { env } from "../env";
import { ApiProblem } from "../errors";
import { fallbackFor } from "./fallback";

/**
 * GET /coach/recommendation — HuggingFace produces, Zod + policy gate, canned
 * Turkish JSON is the safety net (docs/building-blocks/04-llm-coach.md).
 * Nothing but category minutes, the score and completed task titles ever
 * leaves this process (docs/PRIVACY.md, docs/ARCHITECTURE.md "LLM boundary").
 */

/**
 * OpenAI-compatible chat endpoint. HF_MODEL_ID picks the deployment, HF_BASE_URL
 * the host: the HF router by default, a self-served vLLM when one is measured
 * (docs/colab/trendyol-coach.ipynb). Read per call so a test can repoint it.
 */
const hfUrl = () => `${env.HF_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

export const SYSTEM_PROMPT = [
  "Sen 13-18 yaş arası gençler için Türkçe yazan bir dijital denge koçusun.",
  "Teşhis koymazsın, etiketlemezsin, suçlamazsın; kısa ve uygulanabilir öneriler verirsin.",
  "Yalnızca tek bir JSON nesnesi döndür, başka hiçbir metin yazma:",
  '{"tips":["","",""],"task":{"title":"","steps":["",""],"eta_minutes":15},"share_text":""}',
  "Kurallar: tips tam 3 madde; steps 2-5 madde; eta_minutes 5-30 arası tam sayı;",
  "hiçbir metinde bağlantı adresi olmasın; share_text veliyle paylaşılabilecek tek cümle olsun.",
].join("\n");

/** The only fields a prompt may ever carry. */
export type PromptInput = {
  minutes: CategoryMinutes;
  score: { value: number; reasons: string[] };
  completed_tasks: string[];
};

/**
 * Explicit allow-list: the object handed to JSON.stringify is rebuilt field by
 * field from known keys, so a stray `url`/`hostname` on the source object can
 * never be serialized into a prompt — whatever a future caller passes.
 */
export function buildUserPrompt(source: PromptInput): string {
  const minutes: Partial<Record<string, number>> = {};
  for (const id of CATEGORY_IDS) {
    const value = source.minutes[id];
    if (typeof value === "number" && value > 0) minutes[id] = value;
  }
  return JSON.stringify({
    minutes,
    score: {
      value: Number(source.score.value),
      reasons: source.score.reasons.slice(0, 3).map(String),
    },
    completed_tasks: source.completed_tasks.slice(0, 3).map(String),
  });
}

/**
 * Safe-language post-check (docs/ARCHITECTURE.md). Runs over the serialized
 * object so every string is covered; the keys are fixed English so they cannot
 * false-positive. Turkish lowercase: "BAĞIMLISIN" → "bağımlısın", not "bağimlisin".
 */
const BANNED = [
  "teşhis",
  "teshis",
  "depresyon tanısı",
  "depresyon tanisi",
  "bağımlısın",
  "bagimlisin",
  "kötü çocuk",
  "kotu cocuk",
  "http://",
  "https://",
];

export const isSafeCoach = (coach: Coach): boolean => {
  const text = JSON.stringify(coach).toLocaleLowerCase("tr");
  return !BANNED.some((term) => text.includes(term));
};

type ScoreRow = { value: number; reasons: unknown; periodStart: Date; periodEnd: Date; computedAt: Date };

/** Model answer, or null for unset env, timeout, network, parse, schema or policy failure. */
async function modelCoach(youthId: string, score: ScoreRow): Promise<Coach | null> {
  if (!env.HF_TOKEN || !env.HF_MODEL_ID) return null;

  const summary = await prisma.categorySummary.findFirst({
    where: { youthId, periodStart: score.periodStart, periodEnd: score.periodEnd },
  });
  const done = await prisma.task.findMany({
    where: { youthId, status: "completed" },
    orderBy: { id: "desc" },
    take: 3,
  });

  const prompt = buildUserPrompt({
    minutes: (summary?.minutes ?? {}) as CategoryMinutes,
    score: { value: score.value, reasons: score.reasons as string[] },
    completed_tasks: done.map((task) => task.title),
  });

  try {
    const response = await fetch(hfUrl(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.HF_TOKEN}` },
      body: JSON.stringify({
        model: env.HF_MODEL_ID,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        // Reasoning models (Qwen3 and friends) spend this budget on
        // `reasoning_content` first and only then write `content`. Measured
        // against Qwen/Qwen3-8B: 500 returns a null or truncated body every
        // time, 900 returns valid coach JSON in ~3.8s.
        max_tokens: 900,
        stream: false,
      }),
      // ponytail: no retry. The fallback is the retry, and the demo cannot wait
      // twice. Upgrade path: one retry on 5xx once latency is measured.
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    // Models like to wrap JSON in prose or ``` fences: take the outermost object.
    const candidate = coachSchema.parse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
    return isSafeCoach(candidate) ? candidate : null;
  } catch {
    // Deliberately silent: a log line here could echo the prompt or the raw HF
    // body (docs/PRIVACY.md "Logging and observability").
    return null;
  }
}

type TaskRow = { id: string; title: string; steps: unknown; etaMinutes: number };
type RecommendationRow = { tips: unknown; shareText: string };

const reply = (coach: Coach, source: "model" | "fallback", taskId: string): CoachResponse => ({
  ...coach,
  source,
  task_id: taskId,
});

const storedCoach = (recommendation: RecommendationRow, task: TaskRow): Coach => ({
  tips: recommendation.tips as string[],
  task: { title: task.title, steps: task.steps as string[], eta_minutes: task.etaMinutes },
  share_text: recommendation.shareText,
});

async function recommend(request: Request): Promise<CoachResponse> {
  // Youth, self, active only — a parent sees `share_text` on the weekly report
  // instead (docs/ARCHITECTURE.md AuthZ matrix).
  const youth = requireActiveYouth(await requireUser(request));

  const score = await prisma.score.findFirst({
    where: { youthId: youth.id },
    orderBy: { computedAt: "desc" },
  });
  if (!score) throw new ApiProblem("no_data");

  // Idempotent per score: a reload must not stack a second task on the report.
  const existing = await prisma.coachRecommendation.findFirst({
    where: { youthId: youth.id, createdAt: { gte: score.computedAt } },
    orderBy: { createdAt: "desc" },
  });
  const existingTask = existing?.taskId
    ? await prisma.task.findUnique({ where: { id: existing.taskId } })
    : null;

  if (existing && existingTask) {
    const source = existing.source === "model" ? "model" : "fallback";
    // A completed task is history: never rewrite it, whatever the model says.
    if (source === "model" || existingTask.status === "completed") {
      return reply(storedCoach(existing, existingTask), source, existingTask.id);
    }
    // Fallback + still open: one more try, and the model replaces it in place.
    const upgraded = await modelCoach(youth.id, score);
    if (!upgraded) return reply(storedCoach(existing, existingTask), "fallback", existingTask.id);

    await prisma.task.update({
      where: { id: existingTask.id },
      data: { title: upgraded.task.title, steps: upgraded.task.steps, etaMinutes: upgraded.task.eta_minutes },
    });
    await prisma.coachRecommendation.update({
      where: { id: existing.id },
      data: { tips: upgraded.tips, shareText: upgraded.share_text, source: "model" },
    });
    return reply(upgraded, "model", existingTask.id);
  }

  const produced = await modelCoach(youth.id, score);
  const result = produced ?? fallbackFor(score.value);
  const source = produced ? "model" : "fallback";

  const task = await prisma.task.create({
    data: {
      youthId: youth.id,
      title: result.task.title,
      steps: result.task.steps,
      etaMinutes: result.task.eta_minutes,
    },
  });
  await prisma.coachRecommendation.create({
    data: { youthId: youth.id, tips: result.tips, shareText: result.share_text, taskId: task.id, source },
  });

  return reply(result, source, task.id);
}

export const coach = new Elysia({ name: "coach" }).get("/coach/recommendation", async ({ request, set }) => {
  const recommendation = await recommend(request);
  // docs/API.md: the client may read provenance from the header or the body.
  set.headers["x-nexora-coach"] = recommendation.source;
  return recommendation;
});
