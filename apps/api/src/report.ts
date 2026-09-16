import { CATEGORY_IDS, type CategoryId, type CategoryMinutes } from "@nexora/shared";
import { Elysia } from "elysia";
import { requireActiveYouth, requireUser, resolveYouthTarget } from "./auth";
import { prisma } from "./db";
import { ApiProblem } from "./errors";
import { formatPeriod } from "./score";

/**
 * GET /reports/weekly and POST /tasks/:id/complete (docs/API.md).
 * The report is computed on read — ponytail: no job queue, no materialized
 * weekly table. Upgrade path: a cron + a ReportSnapshot row if a class of 30
 * ever makes the read slow. Category totals only: a hostname has no key here
 * and never will (docs/PRIVACY.md).
 */

/** How many periods the trend sparkline shows (docs/DESIGN.md: 2 points is enough). */
const TREND_POINTS = 4;

export const report = new Elysia({ name: "report" })
  .get("/reports/weekly", async ({ request, query }) => {
    // Youth → self; parent/teacher/admin → youthId required, linked, active.
    const youthId = await resolveYouthTarget(await requireUser(request), query.youthId);

    const week = query.week;
    if (week !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
      throw new ApiProblem("validation_error", "week parametresi YYYY-MM-DD biçiminde olmalı.");
    }

    const score = await prisma.score.findFirst({
      where: week ? { youthId, periodStart: new Date(`${week}T00:00:00.000Z`) } : { youthId },
      orderBy: { computedAt: "desc" },
    });
    // Active youth with nothing ingested yet: the panel's empty state, not a 404.
    if (!score) {
      return {
        youthId,
        period: null,
        score: null,
        distribution: {},
        trend: [],
        task: null,
        share_text: null,
        empty: true,
      };
    }

    const summary = await prisma.categorySummary.findFirst({
      where: { youthId, periodStart: score.periodStart, periodEnd: score.periodEnd },
    });
    const minutes = (summary?.minutes ?? {}) as CategoryMinutes;
    // Exhaustive: the ready-report schema expects all 8 categories, zeros included.
    const distribution = Object.fromEntries(
      CATEGORY_IDS.map((id: CategoryId) => [id, minutes[id] ?? 0]),
    );

    const history = await prisma.score.findMany({ where: { youthId }, orderBy: { periodStart: "asc" } });
    const byPeriod = new Map<string, number>();
    for (const row of history) byPeriod.set(formatPeriod(row.periodStart, row.periodEnd), row.value);
    const trend = [...byPeriod].slice(-TREND_POINTS).map(([period, value]) => ({ period, value }));

    // ponytail: Task has no createdAt column, and cuid() sorts by creation time,
    // so "latest task" is the highest id. Upgrade path: add createdAt to Task.
    const task = await prisma.task.findFirst({ where: { youthId }, orderBy: { id: "desc" } });
    const recommendation = await prisma.coachRecommendation.findFirst({
      where: { youthId },
      orderBy: { createdAt: "desc" },
    });

    return {
      youthId,
      period: formatPeriod(score.periodStart, score.periodEnd),
      score: { value: score.value, reasons: score.reasons as string[] },
      distribution,
      trend,
      task: task ? { id: task.id, title: task.title, status: task.status } : null,
      share_text: recommendation?.shareText ?? null,
      empty: false,
    };
  })

  .post("/tasks/:id/complete", async ({ request, params }) => {
    const youth = requireActiveYouth(await requireUser(request));

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    // Somebody else's task is indistinguishable from a missing one (docs/API.md).
    if (!task || task.youthId !== youth.id) throw new ApiProblem("no_data");

    // Idempotent: completing twice returns the first completion unchanged.
    const completed =
      task.status === "completed" && task.completedAt
        ? task
        : await prisma.task.update({
            where: { id: task.id },
            data: { status: "completed", completedAt: new Date(), badge: "degerli_adim" },
          });

    return {
      id: completed.id,
      status: "completed",
      completedAt: (completed.completedAt ?? new Date()).toISOString(),
      badge: "degerli_adim",
    };
  });
