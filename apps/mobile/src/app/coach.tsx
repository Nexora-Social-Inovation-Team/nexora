import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import type { CoachResponse, WeeklyReport } from "@nexora/shared";

import { completeTask, failureCode, getCoach, getWeeklyReport } from "@/api";
import { Btn, Card, PageHeading, Screen, StateView, TaskDone, s, useActiveGate } from "@/ui";

const reportTask = (report: WeeklyReport | null): WeeklyReport["task"] =>
  report && !report.empty ? report.task : null;

/** Screen 4 — three tips plus one micro-task. */
export default function Coach() {
  const active = useActiveGate();
  const [view, setView] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [problem, setProblem] = useState<string>();
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  // The coach payload carries task_id but no status, so the week's task state
  // comes from the report — the same source the score screen already reads.
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setView("loading");
    try {
      const [next, report] = await Promise.all([getCoach(), getWeeklyReport().catch(() => null)]);
      const task = reportTask(report);
      setCoach(next);
      setDone(task?.id === next.task_id && task.status === "completed");
      setView("ready");
    } catch (error) {
      const code = failureCode(error);
      if (code === "consent_missing") {
        router.replace("/waiting");
        return;
      }
      if (code === "no_data") {
        setView("empty");
        return;
      }
      setProblem(error instanceof Error ? error.message : "Koç önerisi alınamadı.");
      setView("error");
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  async function complete() {
    if (!coach) return;
    try {
      await completeTask(coach.task_id);
      setDone(true);
      router.replace({ pathname: "/done", params: { share: coach.share_text } });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Görev tamamlanamadı.");
    }
  }

  return (
    <Screen>
      <PageHeading title="Koç önerileri" body="Her şeyi değiştirmene gerek yok. Bugün bir adım yeter." />
      {view !== "ready" || !coach ? (
        <StateView
          state={view === "ready" ? "loading" : view}
          message={
            view === "empty"
              ? "Henüz skorun yok, bu yüzden koç önerisi de yok. Özet geldiğinde buraya dönebilirsin."
              : problem
          }
          onRetry={() => void load()}
        />
      ) : (
        <>
          {coach.tips.map((tip, index) => (
            <Card key={tip}>
              <View style={s.numberedRow}>
                <Text style={s.number}>0{index + 1}</Text>
                <Text testID="tip" style={[s.body, s.flexible]}>
                  {tip}
                </Text>
              </View>
            </Card>
          ))}
          <Card tinted>
            <Text style={s.eyebrow}>BUGÜNKÜ MİKRO-GÖREVİN</Text>
            <Text style={s.subtitle}>{coach.task.title}</Text>
            {coach.task.steps.map((step, index) => (
              <Text key={step} style={s.body}>
                {index + 1}. {step}
              </Text>
            ))}
            <Text style={s.muted}>Tahmini süre: {coach.task.eta_minutes} dk</Text>
          </Card>
          {done ? (
            <TaskDone title={coach.task.title} />
          ) : (
            <Btn
              label="Görevi tamamladım"
              onPress={() => void complete()}
              hint="Görevi tamamlandı olarak işaretler"
            />
          )}
          {problem ? <Text style={s.error}>{problem}</Text> : null}
          <Btn label="Dengeme dön" variant="ghost" onPress={() => router.replace("/score")} />
        </>
      )}
    </Screen>
  );
}
