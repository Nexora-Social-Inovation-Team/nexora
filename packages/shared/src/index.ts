import { z } from "zod";

/**
 * Wire contract for every NEXORA surface. Shapes come from docs/API.md.
 * Nothing here may model a URL, hostname, path, page content or message.
 */

/* ---------------------------------------------------------------- identity */

export const roleSchema = z.enum(["youth", "parent", "teacher", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const accountStatusSchema = z.enum(["pending_parent_consent", "active", "revoked"]);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const personaSchema = z.enum([
  "deniz",
  "ece",
  "mert",
  "selin",
  "deniz_balanced",
  "deniz_risky",
  "deniz_productive",
]);
export type Persona = z.infer<typeof personaSchema>;

export const userSchema = z.object({
  id: z.string().min(1),
  role: roleSchema,
  status: accountStatusSchema,
  displayName: z.string().min(1),
  linkedYouthId: z.string().min(1).nullable(),
});
export type User = z.infer<typeof userSchema>;

export const loginRequestSchema = z.object({ persona: personaSchema });
export const loginResponseSchema = z.object({ user: userSchema, token: z.string().min(1) });

/* ---------------------------------------------------------------- consent */

export const consentRequestSchema = z.object({ youthId: z.string().min(1) });

export const consentApproveResponseSchema = z.object({
  youthId: z.string().min(1),
  status: z.literal("active"),
  approvedAt: z.iso.datetime(),
});

export const consentRevokeResponseSchema = z.object({
  youthId: z.string().min(1),
  status: z.literal("revoked"),
  revokedAt: z.iso.datetime(),
});

/* -------------------------------------------------------------- categories */

export const CATEGORY_IDS = [
  "science",
  "arts",
  "sports",
  "culture",
  "entrepreneurship",
  "national_memory",
  "entertainment",
  "harmful",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const categoryIdSchema = z.enum(CATEGORY_IDS);

/** Turkish labels, docs/ARCHITECTURE.md "Score v0.5 > Categories". */
export const CATEGORY_LABELS_TR: Record<CategoryId, string> = {
  science: "Bilim",
  arts: "Sanat",
  sports: "Spor",
  culture: "Kültür",
  entrepreneurship: "Girişimcilik",
  national_memory: "Millî hafıza",
  entertainment: "Eğlence",
  harmful: "Zararlı / manipülatif",
};

/** Categories the score rewards; entertainment is neutral, harmful negative. */
export const VALUABLE_CATEGORIES = [
  "science",
  "arts",
  "sports",
  "culture",
  "entrepreneurship",
  "national_memory",
] as const satisfies readonly CategoryId[];

/** Partial: unknown keys and negative minutes are rejected. */
export const categoryMinutesSchema = z.partialRecord(categoryIdSchema, z.number().int().min(0));
export type CategoryMinutes = z.infer<typeof categoryMinutesSchema>;

/* ------------------------------------------------------------------ errors */

export const apiErrorCodeSchema = z.enum([
  "unauthorized",
  "forbidden",
  "consent_missing",
  "no_data",
  "validation_error",
  "upstream_unavailable",
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({ code: apiErrorCodeSchema, message: z.string().min(1) }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/* ----------------------------------------------------------------- privacy */

/**
 * Keys that may never reach the API at any depth (docs/PRIVACY.md).
 * Signals ingest only — a coach task or report task legitimately has `title`.
 */
export const FORBIDDEN_PAYLOAD_KEYS = [
  "url",
  "urls",
  "hostname",
  "hostnames",
  "path",
  "title",
  "content",
] as const;

/** First forbidden key anywhere in an object/array tree, else null. */
export function findForbiddenKey(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findForbiddenKey(item);
      if (hit) return hit;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if ((FORBIDDEN_PAYLOAD_KEYS as readonly string[]).includes(key.toLowerCase())) return key;
      const hit = findForbiddenKey(child);
      if (hit) return hit;
    }
  }
  return null;
}

/* ------------------------------------------------------------ signals/score */

/** Inclusive UTC date range, `YYYY-MM-DD/YYYY-MM-DD`. */
export const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/, "period must be YYYY-MM-DD/YYYY-MM-DD");

export const signalsRequestSchema = z.strictObject({
  period: periodSchema,
  minutes: categoryMinutesSchema,
});
export type SignalsRequest = z.infer<typeof signalsRequestSchema>;

export const scoreSchema = z.object({
  value: z.number().int().min(0).max(100),
  reasons: z.array(z.string().min(1)).length(3),
});
export type Score = z.infer<typeof scoreSchema>;

export const signalsResponseSchema = z.object({
  id: z.string().min(1),
  period: periodSchema,
  minutes: categoryMinutesSchema,
  score: scoreSchema,
});

export const scoreCurrentSchema = scoreSchema.extend({
  youthId: z.string().min(1),
  computedAt: z.iso.datetime(),
  period: periodSchema,
});

/* ------------------------------------------------------------------- coach */

/** Exactly the model's JSON object — no extra keys allowed. */
export const coachSchema = z.strictObject({
  tips: z.array(z.string().min(1)).length(3),
  task: z.strictObject({
    title: z.string().min(1),
    steps: z.array(z.string().min(1)).min(2).max(5),
    eta_minutes: z.number().int().min(5).max(30),
  }),
  share_text: z.string().min(1),
});
export type Coach = z.infer<typeof coachSchema>;

/** What GET /coach/recommendation returns: coach JSON + provenance. */
export const coachResponseSchema = coachSchema.extend({
  source: z.enum(["model", "fallback"]),
  task_id: z.string().min(1),
});
export type CoachResponse = z.infer<typeof coachResponseSchema>;

/* ------------------------------------------------------------ report/tasks */

export const taskStatusSchema = z.enum(["open", "completed"]);

export const reportTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: taskStatusSchema,
});

const trendPointSchema = z.object({
  period: periodSchema,
  value: z.number().int().min(0).max(100),
});

export const weeklyReportReadySchema = z.object({
  youthId: z.string().min(1),
  period: periodSchema,
  score: scoreSchema,
  // exhaustive: a ready report carries all 8 categories, zeros included
  distribution: z.record(categoryIdSchema, z.number().int().min(0)),
  trend: z.array(trendPointSchema),
  task: reportTaskSchema.nullable(),
  share_text: z.string().min(1).nullable(),
  empty: z.literal(false),
});

export const weeklyReportEmptySchema = z.object({
  youthId: z.string().min(1),
  period: z.null(),
  score: z.null(),
  distribution: z.strictObject({}),
  trend: z.array(trendPointSchema).max(0),
  task: z.null(),
  share_text: z.null(),
  empty: z.literal(true),
});

export const weeklyReportSchema = z.discriminatedUnion("empty", [
  weeklyReportReadySchema,
  weeklyReportEmptySchema,
]);
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;

export const taskCompleteResponseSchema = z.object({
  id: z.string().min(1),
  status: z.literal("completed"),
  completedAt: z.iso.datetime(),
  badge: z.literal("degerli_adim"),
});
