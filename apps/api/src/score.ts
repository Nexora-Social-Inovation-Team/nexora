import { computeScore } from "@nexora/score";
import { findForbiddenKey, signalsRequestSchema } from "@nexora/shared";
import { Elysia } from "elysia";
import { requireActiveYouth, requireUser, resolveYouthTarget } from "./auth";
import { prisma } from "./db";
import { ApiProblem } from "./errors";

/**
 * Category-minute ingest and the rule-engine score (docs/building-blocks/03).
 * Minutes only: no URL, hostname or page content enters this module, its
 * request bodies, its tables or its logs (docs/PRIVACY.md).
 */

/** `YYYY-MM-DD/YYYY-MM-DD` (already format-checked by periodSchema) → UTC dates. */
const parsePeriod = (period: string) => {
  const [start, end] = period.split("/");
  const periodStart = new Date(`${start}T00:00:00.000Z`);
  const periodEnd = new Date(`${end}T00:00:00.000Z`);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || start > end) {
    throw new ApiProblem("validation_error", "Dönem aralığı geçersiz.");
  }
  return { periodStart, periodEnd };
};

export const formatPeriod = (periodStart: Date, periodEnd: Date) =>
  `${periodStart.toISOString().slice(0, 10)}/${periodEnd.toISOString().slice(0, 10)}`;

export const signalsScore = new Elysia({ name: "signals-score" })
  .post("/signals/category-summary", async ({ request, body, status }) => {
    // Privacy contract before anything else: a URL-ish key at any depth is
    // refused even if a future schema change would have tolerated it.
    if (findForbiddenKey(body)) {
      throw new ApiProblem("validation_error", "Bağlantı, alan adı veya içerik alanları kabul edilmez.");
    }
    const { period, minutes } = signalsRequestSchema.parse(body);
    const { periodStart, periodEnd } = parsePeriod(period);

    const youth = requireActiveYouth(await requireUser(request));

    // Before any write: an all-zero week throws NoScoreDataError, which the
    // global onError maps to 404 no_data, so nothing is persisted.
    const score = computeScore(minutes);

    const [summary] = await prisma.$transaction([
      prisma.categorySummary.upsert({
        where: { youthId_periodStart_periodEnd: { youthId: youth.id, periodStart, periodEnd } },
        create: { youthId: youth.id, periodStart, periodEnd, minutes },
        update: { minutes },
      }),
      // ponytail: re-ingesting a period replaces its score instead of stacking
      // duplicates on the report trend. Upgrade path: @@unique on Score and a
      // real upsert, once a migration is cheap to apply.
      prisma.score.deleteMany({ where: { youthId: youth.id, periodStart, periodEnd } }),
      prisma.score.create({
        data: { youthId: youth.id, value: score.value, reasons: score.reasons, periodStart, periodEnd },
      }),
    ]);

    return status(201, { id: summary.id, period, minutes, score });
  })

  .get("/score/current", async ({ request, query }) => {
    const youthId = await resolveYouthTarget(await requireUser(request), query.youthId);

    const score = await prisma.score.findFirst({ where: { youthId }, orderBy: { computedAt: "desc" } });
    if (!score) throw new ApiProblem("no_data");

    return {
      youthId,
      value: score.value,
      reasons: score.reasons as string[],
      computedAt: score.computedAt.toISOString(),
      period: formatPeriod(score.periodStart, score.periodEnd),
    };
  });
