import { CATEGORY_IDS, CATEGORY_LABELS_TR, type WeeklyReport } from "@nexora/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblem, approveConsent, fetchWeeklyReport } from "./api";
import { tr } from "./i18n";

const card = "mt-6 rounded-lg bg-surface p-5";

function Skeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className={card}>
      <p>{t("panel.loading")}</p>
      <div aria-hidden="true" className="mt-4 space-y-3">
        <div className="h-10 w-24 animate-pulse rounded bg-muted/30" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}

function Ready({ report }: { report: Extract<WeeklyReport, { empty: false }> }) {
  const { t } = useTranslation();
  const total = Math.max(1, ...Object.values(report.distribution));

  return (
    <>
      <section className={card} aria-labelledby="score-title">
        <h2 id="score-title" className="text-xl">
          {t("panel.scoreTitle")}
        </h2>
        <p className="mt-2 font-display text-6xl text-accent">{report.score.value}</p>
        <p className="text-muted">{t("panel.scoreOutOf")}</p>
        <p className="mt-1 text-muted">{`${t("panel.periodLabel")}: ${report.period}`}</p>
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
        <ul className="mt-3 space-y-2">
          {CATEGORY_IDS.map((id) => {
            const minutes = report.distribution[id] ?? 0;
            return (
              <li key={id} className="flex flex-wrap items-center gap-3">
                <span className="w-44">{CATEGORY_LABELS_TR[id]}</span>
                <span className="tabular-nums">{`${minutes} ${t("panel.minutes")}`}</span>
                <span aria-hidden="true" className="h-2 rounded bg-accent" style={{ width: `${(minutes / total) * 40}%` }} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className={card} aria-labelledby="trend-title">
        <h2 id="trend-title" className="text-xl">
          {t("panel.trendTitle")}
        </h2>
        <ul className="mt-3 space-y-1">
          {report.trend.map((point) => (
            <li key={point.period}>{`${point.period} · ${point.value}`}</li>
          ))}
        </ul>
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
            <blockquote className="mt-2 border-l-2 border-accent pl-3">{report.share_text}</blockquote>
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

export function WeeklyReportPanel({ canApprove }: { canApprove: boolean }) {
  const { t } = useTranslation();
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
                ? "rounded bg-accent px-3 py-1 font-semibold text-bg"
                : "rounded border border-muted px-3 py-1"
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
              className="mt-4 rounded bg-accent px-4 py-2 font-semibold text-bg disabled:opacity-70"
            >
              {approve.isPending ? t("panel.approving") : t("panel.approve")}
            </button>
          ) : null}
          {approve.isError ? (
            <p role="alert" className="mt-3 border-l-4 border-danger pl-3">
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
          {/* --danger carries too little contrast on --surface for AA text, so it stays a border. */}
          <p role="alert" className="border-l-4 border-danger pl-3">
            {t("panel.error")}
          </p>
          <button
            type="button"
            onClick={() => void report.refetch()}
            className="mt-4 rounded bg-accent px-4 py-2 font-semibold text-bg"
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
