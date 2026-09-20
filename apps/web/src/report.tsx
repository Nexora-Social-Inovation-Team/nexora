import { CATEGORY_IDS, CATEGORY_LABELS_TR, type CategoryId, type WeeklyReport } from "@nexora/shared";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblem, approveConsent, fetchWeeklyReport } from "./api";
import { tr } from "./i18n";
import { btnPrimary, cardClass, useSession } from "./ui";

const card = `mt-6 ${cardClass}`;

function Skeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className={card}>
      <p>{t("panel.loading")}</p>
      <div aria-hidden="true" className="mt-4 space-y-3">
        <div className="h-12 w-28 animate-pulse rounded-lg bg-band" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-band" />
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-band" />
      </div>
    </div>
  );
}

/** The last two points, as the one sentence a parent actually wants. */
function trendLine(trend: { period: string; value: number }[]): { key: string; vars: Record<string, number> } {
  const [previous, current] = trend.slice(-2);
  if (!current) return { key: "panel.trendSingle", vars: {} };
  const delta = current.value - previous.value;
  const vars = { delta: Math.abs(delta), from: previous.value, to: current.value };
  if (delta === 0) return { key: "panel.trendFlat", vars };
  return { key: delta > 0 ? "panel.trendUp" : "panel.trendDown", vars };
}

/** 210 minutes reads as "3 sa 30 dk"; under an hour stays in minutes. */
function durationTr(minutes: number, hoursLabel: string, minutesLabel: string): string {
  if (minutes < 60) return `${minutes} ${minutesLabel}`;
  const rest = minutes % 60;
  return rest === 0
    ? `${Math.floor(minutes / 60)} ${hoursLabel}`
    : `${Math.floor(minutes / 60)} ${hoursLabel} ${rest} ${minutesLabel}`;
}

/** docs/DESIGN.md: the score bands are `<50` / `50–79` / `≥80` — the same edges the API coach fallback uses. */
function bandOf(value: number): "low" | "mid" | "high" {
  return value < 50 ? "low" : value < 80 ? "mid" : "high";
}

/**
 * `2026-09-08/2026-09-15` is a wire format, not something a parent reads.
 * Turkish months, one year, and the month repeated only when the week crosses one.
 */
function periodTr(period: string): string {
  const [from, to] = period.split("/");
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return period;
  const opts = { timeZone: "UTC" } as const;
  const full = new Intl.DateTimeFormat("tr-TR", { ...opts, day: "numeric", month: "long", year: "numeric" });
  // The extension posts a single day (`2026-09-20/2026-09-20`), which must not read as "20–20".
  if (from === to) return full.format(start);
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${new Intl.DateTimeFormat("tr-TR", { ...opts, day: "numeric" }).format(start)}–${full.format(end)}`
    : `${new Intl.DateTimeFormat("tr-TR", { ...opts, day: "numeric", month: "long" }).format(start)} – ${full.format(end)}`;
}

/*
  The bar sits under its own label, not beside it. Inline, the fixed w-44 label
  plus the value left about 80px on a phone, so a long bar wrapped to a line of
  its own while a short one shrank to a dot — the column stopped being
  comparable. A full-width track also gives the zero rows something to be zero
  against, and matches the Expo screen.
*/
function DistributionBars({ distribution }: { distribution: Partial<Record<CategoryId, number>> }) {
  const { t } = useTranslation();
  // The busiest category, not the sum — bars are drawn relative to the peak.
  const peak = Math.max(1, ...Object.values(distribution));
  const total = Object.values(distribution).reduce((sum, minutes) => sum + minutes, 0);
  // Biggest first: a fixed order buries the one category a parent came to see,
  // and it puts the zeros at the bottom for free.
  const ordered = [...CATEGORY_IDS].sort((a, b) => (distribution[b] ?? 0) - (distribution[a] ?? 0));

  return (
    <>
      <p className="mt-3 text-muted">{`${t("panel.totalLabel")}: ${durationTr(total, t("panel.hours"), t("panel.minutes"))}`}</p>
      <ul className="mt-3 space-y-3">
      {ordered.map((id) => {
        const minutes = distribution[id] ?? 0;
        return (
          <li key={id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span>{CATEGORY_LABELS_TR[id]}</span>
              <span className="tabular-nums">{`${minutes} ${t("panel.minutes")}`}</span>
            </div>
            <span aria-hidden="true" className="block h-2 rounded-full bg-band">
              <span
                className="block h-2 rounded-full bg-link"
                style={{ width: `${Math.round((minutes / peak) * 100)}%` }}
              />
            </span>
          </li>
        );
      })}
      </ul>
    </>
  );
}

function Ready({ report }: { report: Extract<WeeklyReport, { empty: false }> }) {
  const { t } = useTranslation();
  const band = bandOf(report.score.value);
  const trend = trendLine(report.trend);

  return (
    <>
      <section className={card} aria-labelledby="score-title">
        <h2 id="score-title" className="text-xl">
          {t("panel.scoreTitle")}
        </h2>
        <p className="mt-3 font-display text-7xl tabular-nums">{report.score.value}</p>
        <p className="text-muted">{t("panel.scoreOutOf")}</p>
        {/* The number alone says nothing to a parent: the word and the sentence do. */}
        <p className="mt-3 inline-block rounded-full border border-line bg-band px-3 py-1 text-sm font-medium">
          {t(`panel.bands.${band}`)}
        </p>
        <p className="mt-2">{t(`panel.bandBody.${band}`)}</p>
        <p className="mt-1 text-muted">{`${t("panel.periodLabel")}: ${periodTr(report.period)}`}</p>
        <h3 className="mt-5 text-lg">{t("panel.reasonsTitle")}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {report.score.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="distribution-title">
        <h2 id="distribution-title" className="text-xl">
          {t("panel.distributionTitle")}
        </h2>
        <DistributionBars distribution={report.distribution} />
      </section>

      <section className={card} aria-labelledby="trend-title">
        <h2 id="trend-title" className="text-xl">
          {t("panel.trendTitle")}
        </h2>
        {/* Direction and difference, not two wire periods a parent has to subtract. */}
        <p className="mt-2">{t(trend.key, trend.vars)}</p>
      </section>

      <section className={card} aria-labelledby="task-title">
        <h2 id="task-title" className="text-xl">
          {t("panel.taskTitle")}
        </h2>
        {report.task ? (
          <>
            <p className="mt-2">{report.task.title}</p>
            <p className="mt-1 text-muted">
              {report.task.status === "completed" ? t("panel.taskCompleted") : t("panel.taskOpen")}
            </p>
          </>
        ) : (
          <p className="mt-2 text-muted">{t("panel.taskNone")}</p>
        )}
        {report.share_text ? (
          <>
            <h3 className="mt-5 text-lg">{t("panel.shareTitle")}</h3>
            <blockquote className="mt-2 rounded-xl bg-band px-4 py-3">{report.share_text}</blockquote>
          </>
        ) : null}
      </section>

      <section className={card} aria-labelledby="goal-title">
        <h2 id="goal-title" className="text-xl">
          {t("panel.goalTitle")}
        </h2>
        <p className="mt-2">{t("panel.goal")}</p>
      </section>
    </>
  );
}

export function WeeklyReportPanel() {
  const { t } = useTranslation();
  const { user } = useSession();
  const canApprove = user?.role === "parent" || user?.role === "admin";
  const [youthId, setYouthId] = useState<string>(tr.panel.youths[0].id);

  const report = useQuery({
    queryKey: ["weekly-report", youthId],
    queryFn: () => fetchWeeklyReport(youthId),
    retry: false,
  });

  const approve = useMutation({
    mutationFn: () => approveConsent(youthId),
    onSuccess: () => report.refetch(),
  });

  const problem = report.error instanceof ApiProblem ? report.error.code : report.error ? "network" : null;

  return (
    <>
      <div role="group" aria-label={t("panel.youthLabel")} className="mt-4 flex flex-wrap gap-2">
        {tr.panel.youths.map((youth) => (
          <button
            key={youth.id}
            type="button"
            aria-pressed={youth.id === youthId}
            onClick={() => setYouthId(youth.id)}
            className={
              youth.id === youthId
                ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-bg"
                : "rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium"
            }
          >
            {youth.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-muted">{t("panel.kvkk")}</p>

      {report.isPending ? <Skeleton /> : null}

      {problem === "consent_missing" ? (
        <section className={card} aria-live="polite">
          <h2 className="text-xl">{t("panel.consentTitle")}</h2>
          <p className="mt-2 text-muted">{t("panel.consentBody")}</p>
          {canApprove ? (
            <button
              type="button"
              disabled={approve.isPending}
              onClick={() => approve.mutate()}
              className={`${btnPrimary} mt-4`}
            >
              {approve.isPending ? t("panel.approving") : t("panel.approve")}
            </button>
          ) : null}
          {approve.isError ? (
            <p role="alert" className="mt-3 border-l-4 border-danger pl-3 text-danger">
              {t("panel.approveError")}
            </p>
          ) : null}
        </section>
      ) : null}

      {problem === "forbidden" ? (
        <section className={card}>
          <p role="alert">{t("panel.forbidden")}</p>
        </section>
      ) : null}

      {problem && problem !== "consent_missing" && problem !== "forbidden" ? (
        <section className={card}>
          {/* --danger clears AA on --surface now; the border keeps the state non-colour-only. */}
          <p role="alert" className="border-l-4 border-danger pl-3 text-danger">
            {t("panel.error")}
          </p>
          <button
            type="button"
            onClick={() => void report.refetch()}
            className={`${btnPrimary} mt-4`}
          >
            {t("panel.retry")}
          </button>
        </section>
      ) : null}

      {report.data?.empty ? (
        <section className={card}>
          <p>{t("panel.empty")}</p>
          <p className="mt-2 text-muted">{t("panel.emptyHint")}</p>
        </section>
      ) : null}

      {report.data && !report.data.empty ? <Ready report={report.data} /> : null}
    </>
  );
}

/**
 * The teacher's default view: one class week, not one child's week.
 *
 * ponytail: the class is the three demo youths in `tr.panel.youths`, read one
 * `GET /reports/weekly` each and summed here. A real `Class` model and a
 * class-scoped endpoint are post-Phase A — docs/API.md has neither.
 */
export function ClassReportPanel() {
  const { t } = useTranslation();

  const queries = useQueries({
    queries: tr.panel.youths.map((youth) => ({
      queryKey: ["weekly-report", youth.id],
      queryFn: () => fetchWeeklyReport(youth.id),
      retry: false,
    })),
  });

  const rows = queries.map((query, index) => {
    const youth = tr.panel.youths[index];
    const code = query.error instanceof ApiProblem ? query.error.code : query.error ? "network" : null;
    const report = query.data && !query.data.empty ? query.data : null;
    const state = query.isPending
      ? "pending"
      : code === "consent_missing"
        ? "waiting"
        : code
          ? "error"
          : report
            ? "ready"
            : "empty";
    return { ...youth, report, state };
  });

  const ready = rows.flatMap((row) => (row.report ? [row.report] : []));
  const average = ready.length
    ? Math.round(ready.reduce((sum, report) => sum + report.score.value, 0) / ready.length)
    : null;
  const needs = ready.filter((report) => report.score.value < 50).length;
  const distribution = Object.fromEntries(
    CATEGORY_IDS.map((id) => [id, ready.reduce((sum, report) => sum + (report.distribution[id] ?? 0), 0)]),
  ) as Record<CategoryId, number>;
  const peak = CATEGORY_IDS.reduce((a, b) => (distribution[b] > distribution[a] ? b : a));
  // Harmful minutes anywhere in the class outrank the peak: that is the week's activity.
  const activity = distribution.harmful > 0 ? "harmful" : peak === "entertainment" ? "entertainment" : "balanced";

  const allPending = rows.every((row) => row.state === "pending");
  const allFailed = rows.every((row) => row.state === "error");

  return (
    <>
      <p className="mt-3 text-muted">{t("panel.kvkk")}</p>

      {allPending ? <Skeleton /> : null}

      {allFailed ? (
        <section className={card}>
          <p role="alert" className="border-l-4 border-danger pl-3 text-danger">
            {t("panel.error")}
          </p>
          <button
            type="button"
            onClick={() => queries.forEach((query) => void query.refetch())}
            className={`${btnPrimary} mt-4`}
          >
            {t("panel.retry")}
          </button>
        </section>
      ) : null}

      {allPending || allFailed ? null : (
        <>
          {ready.length ? (
            <>
              <section className={card} aria-labelledby="class-title">
                <h2 id="class-title" className="text-xl">
                  {t("panel.class.summaryTitle")}
                </h2>
                <p className="mt-3 font-display text-7xl tabular-nums">{average}</p>
                <p className="text-muted">{t("panel.class.average")}</p>
                <p className="mt-1">{t("panel.class.support", { needs, total: rows.length })}</p>
                <p className="mt-1 text-muted">{`${t("panel.periodLabel")}: ${periodTr(ready[0].period)}`}</p>
              </section>

              <section className={card} aria-labelledby="class-distribution-title">
                <h2 id="class-distribution-title" className="text-xl">
                  {t("panel.class.distributionTitle")}
                </h2>
                <DistributionBars distribution={distribution} />
              </section>
            </>
          ) : (
            <section className={card}>
              <p>{t("panel.class.empty")}</p>
              <p className="mt-2 text-muted">{t("panel.class.emptyHint")}</p>
            </section>
          )}

          <section className={card} aria-labelledby="roster-title">
            <h2 id="roster-title" className="text-xl">
              {t("panel.class.rosterTitle")}
            </h2>
            {/* Three demo students, labels only — docs/DESIGN.md forbids a 50-row student table. */}
            <table className="mt-3 w-full text-left [&_td]:pr-3 [&_th]:pr-3">
              <caption className="sr-only">{t("panel.class.rosterCaption")}</caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 font-medium">{t("panel.class.columns.youth")}</th>
                  <th scope="col" className="py-2 font-medium">{t("panel.class.columns.score")}</th>
                  <th scope="col" className="py-2 font-medium">{t("panel.class.columns.band")}</th>
                  <th scope="col" className="py-2 font-medium">{t("panel.class.columns.task")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0 align-top">
                    <th scope="row" className="py-2 font-medium">{row.label}</th>
                    <td className="py-2 tabular-nums">{row.report ? row.report.score.value : t("panel.dash")}</td>
                    <td className="py-2">
                      {row.report
                        ? t(`panel.bands.${bandOf(row.report.score.value)}`)
                        : row.state === "waiting"
                          ? t("panel.class.waiting")
                          : row.state === "error"
                            ? t("panel.class.rowError")
                            : t("panel.class.noData")}
                    </td>
                    <td className="py-2">
                      {row.report?.task
                        ? row.report.task.status === "completed"
                          ? t("panel.taskCompleted")
                          : t("panel.taskOpen")
                        : t("panel.dash")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {ready.length ? (
            <section className={card} aria-labelledby="activity-title">
              <h2 id="activity-title" className="text-xl">
                {t("panel.class.activityTitle")}
              </h2>
              <p className="mt-2">{t(`panel.class.activities.${activity}`)}</p>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
