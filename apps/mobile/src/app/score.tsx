import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { CategoryMinutes, Score, WeeklyReport } from "@nexora/shared";

import { failureCode, getScore, getWeeklyReport } from "@/api";
import { Btn, CATEGORIES, Card, PageHeading, Screen, StateView, colors, s, useActiveGate } from "@/ui";

type View3 = "loading" | "ready" | "empty" | "error";

/** Screen 3 — "Bu haftaki dengen". Score + three reasons + category distribution. */
export default function ScoreScreen() {
  const active = useActiveGate();
  const [view, setView] = useState<View3>("loading");
  const [problem, setProblem] = useState<string>();
  const [score, setScore] = useState<Score | null>(null);
  const [minutes, setMinutes] = useState<CategoryMinutes>({});
  const [task, setTask] = useState<WeeklyReport["task"]>(null);

  const load = useCallback(async () => {
    setView("loading");
    try {
      // the report carries the 8-category distribution; the score endpoint is the
      // authority for value + reasons, so a missing report only costs the bars.
      const [current, report] = await Promise.all([
        getScore(),
        getWeeklyReport().catch(() => null),
      ]);
      setScore(current);
      setMinutes(report && !report.empty ? report.distribution : {});
      setTask(report && !report.empty ? report.task : null);
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
      setProblem(error instanceof Error ? error.message : "Skor alınamadı.");
      setView("error");
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  // Only the categories the week actually used, biggest first. Eight rows of
  // which five read "0 dk" is noise, not information; the count below the list
  // keeps the fact that the other categories exist.
  const used = CATEGORIES.map(({ id, label }) => ({ id, label, value: minutes[id] ?? 0 }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value);
  const unused = CATEGORIES.length - used.length;
  const peak = Math.max(1, ...used.map(({ value }) => value));
  const total = used.reduce((sum, { value }) => sum + value, 0);
  // docs/PRIVACY.md "Safety language": support suggestion, never a verdict or diagnosis.
  const needsSupport = total > 0 && (minutes.harmful ?? 0) / total >= 0.15;

  return (
    <Screen>
      <PageHeading title="Bu haftaki dengen" />
      {view !== "ready" || !score ? (
        <StateView
          state={view === "ready" ? "loading" : view}
          message={
            view === "empty"
              ? "Henüz kategori özeti yok. Eklenti özet gönderince veya demo verisi yüklenince skorun burada olur."
              : problem
          }
          onRetry={() => void load()}
        />
      ) : (
        <>
          <View style={x.scorePanel}>
            <Text style={s.eyebrow}>DENGE SKORUN</Text>
            <View style={x.ring} accessible accessibilityLabel={`Skor ${score.value}, 100 üzerinden`}>
              <Text style={x.value}>{score.value}</Text>
              <Text style={s.muted}>/ 100</Text>
            </View>
            <Text style={[s.muted, x.center]}>Sayı bir başlangıç. Asıl hikâye, aşağıdaki üç nedende.</Text>
          </View>
          <Card>
            <Text style={s.subtitle}>Bu skor ne anlatıyor?</Text>
            {score.reasons.map((reason, index) => (
              <View key={reason} style={s.numberedRow}>
                <Text style={s.number}>0{index + 1}</Text>
                <Text testID="reason" style={[s.body, s.flexible]}>{reason}</Text>
              </View>
            ))}
          </Card>
          {needsSupport ? (
            <Text style={x.support}>
              Zararlı içerik payın bu hafta yüksek görünüyor. İstersen güvendiğin bir yetişkinle
              konuş; gerekirse bir uzmandan destek alabilirsin.
            </Text>
          ) : null}
          <Card>
            <Text style={s.subtitle}>Zamanın nereye gitti?</Text>
            {used.map(({ id, label, value }) => (
              <View key={id} style={x.row} accessible accessibilityLabel={`${label}: ${value} dakika`}>
                <View style={x.rowLabel}>
                  <Text style={[s.body, x.label]}>{label}</Text>
                  <Text style={s.muted}>{value} dk</Text>
                </View>
                <View style={x.track}>
                  <View style={[x.bar, { width: `${Math.round((value / peak) * 100)}%` }]} />
                </View>
              </View>
            ))}
            {unused > 0 ? (
              <Text style={s.muted}>{unused} kategoride bu hafta süre yok.</Text>
            ) : null}
          </Card>
          {task?.status === "completed" ? (
            <Card tinted>
              <Text style={s.subtitle} accessibilityLabel="Bu haftaki görevini tamamladın">
                ✦ Bu haftaki görevini tamamladın
              </Text>
              <Text style={s.muted}>{task.title}</Text>
              {/* Demo only: there is no un-complete endpoint (docs/API.md is the
                  whole surface), so the reset is the seed script. */}
              {__DEV__ ? (
                <Text style={x.demoNote}>
                  Demo: baştan almak için terminalde{" "}
                  <Text style={x.demoCode}>bun run --filter nexora-api db:seed</Text>
                </Text>
              ) : null}
            </Card>
          ) : null}
          <Btn label="Koç önerilerini gör" onPress={() => router.push("/coach")} />
        </>
      )}
    </Screen>
  );
}

const x = StyleSheet.create({
  scorePanel: { backgroundColor: colors.tint, borderRadius: 24, padding: 24, alignItems: "center", gap: 20 },
  center: { textAlign: "center" },
  ring: {
    alignSelf: "center",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { color: colors.text, fontSize: 52, fontWeight: "600", letterSpacing: -1.5 },
  support: { color: colors.warn, fontSize: 16, lineHeight: 24 },
  demoNote: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  demoCode: { color: colors.text, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  row: { gap: 6, paddingVertical: 4 },
  rowLabel: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { flex: 1, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.band },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.link },
});
