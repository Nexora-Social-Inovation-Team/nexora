import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CategoryId, Persona, User } from "@nexora/shared";

import { approveConsent, getSession, login, useSession } from "./api";

/**
 * docs/DESIGN.md "Visual tokens", measured off calendly.com through a1.gallery.
 * Same hexes as apps/web/src/styles.css. Score meaning is never encoded as colour.
 */
export const colors = {
  bg: "#FCFBF8",
  band: "#F1EFE9",
  surface: "#FFFFFF",
  line: "#E4E0D8",
  tint: "#E7EEFB",
  text: "#071A31",
  muted: "#4D5F74",
  accent: "#071A31",
  link: "#0B5FD0",
  warn: "#8A5A00",
  danger: "#B3261E",
} as const;

export const KVKK_LINE = "Ham bağlantı, mesaj veya arama kaydı toplanmaz.";

/**
 * Mirrors CATEGORY_IDS + CATEGORY_LABELS_TR from @nexora/shared. Metro and jest
 * cannot execute that package's TypeScript source under bun's isolated linker
 * (its @babel/runtime helpers do not resolve from packages/shared), so mobile
 * imports the package for types only. ponytail: drop this list the day the
 * package ships a build artefact.
 */
export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "science", label: "Bilim" },
  { id: "arts", label: "Sanat" },
  { id: "sports", label: "Spor" },
  { id: "culture", label: "Kültür" },
  { id: "entrepreneurship", label: "Girişimcilik" },
  { id: "national_memory", label: "Millî hafıza" },
  { id: "entertainment", label: "Eğlence" },
  { id: "harmful", label: "Zararlı / manipülatif" },
];

// No `: string` annotation: expo-router's replace() wants the literal union.
export const routeFor = (user: User) => (user.status === "active" ? "/score" : "/waiting");

/** Screens 3–5 are for active youth only; anyone else is sent back. */
export function useActiveGate(): boolean {
  const { user } = useSession();
  useEffect(() => {
    if (!user) router.replace("/");
    else if (user.status !== "active") router.replace("/waiting");
  }, [user]);
  return user?.status === "active";
}

/* ------------------------------------------------------------- primitives */

export function Btn({
  label,
  onPress,
  variant = "primary",
  hint,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  hint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" ? s.btnPrimary : s.btnGhost,
        pressed && s.pressed,
      ]}
    >
      <Text style={variant === "primary" ? s.btnTextPrimary : s.btnTextGhost}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, tinted = false }: { children: ReactNode; tinted?: boolean }) {
  return <View style={[s.card, tinted && s.tinted]}>{children}</View>;
}

export function PageHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <View style={s.headingBand}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
      {body ? <Text style={s.muted}>{body}</Text> : null}
    </View>
  );
}

type IllustrationKind = "welcome" | "waiting" | "balance" | "coach" | "done";

/**
 * Lightweight, asset-free artwork shared by the five mobile screens. The
 * geometric card, orbit and spark shapes keep the visual language consistent
 * with the web and extension while remaining crisp on every device density.
 */
export function Illustration({ kind }: { kind: IllustrationKind }) {
  const copy = {
    welcome: { value: "4", label: "adım" },
    waiting: { value: "01", label: "onay" },
    // Keep the artwork abstract so it does not look like a second score value.
    balance: { value: "↗", label: "denge" },
    coach: { value: "3", label: "öneri" },
    done: { value: "✦", label: "rozet" },
  }[kind];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${copy.value} ${copy.label}`}
      style={[s.illustration, s[`illustration_${kind}` as keyof typeof s] as object]}
    >
      <View style={s.illustrationGlow} />
      <View style={s.illustrationOrbit} />
      <View style={s.illustrationSparkOne} />
      <View style={s.illustrationSparkTwo} />
      <View style={s.illustrationCard}>
        <View style={s.illustrationCardTop}>
          <View style={s.illustrationDot} />
          <View style={[s.illustrationDot, { opacity: 0.5 }]} />
          <View style={[s.illustrationDot, { opacity: 0.25 }]} />
        </View>
        <Text style={s.illustrationValue}>{copy.value}</Text>
        <Text style={s.illustrationLabel}>{copy.label}</Text>
      </View>
    </View>
  );
}

export function Journey({ current }: { current: number }) {
  return (
    <View style={s.journey} accessibilityLabel={`Adım ${current + 1}: ${["Ölç", "Anla", "Koçla", "Üret"][current]}`}>
      {["Ölç", "Anla", "Koçla", "Üret"].map((label, index) => (
        <View key={label} style={s.journeyItem}>
          <View style={[s.journeyLine, index <= current && s.journeyActive]} />
          <Text style={[s.journeyLabel, index === current && s.journeySelected]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function StateView({
  state,
  message,
  onRetry,
}: {
  state: "loading" | "empty" | "error";
  message?: string;
  onRetry?: () => void;
}) {
  if (state === "loading") {
    return (
      <View accessible accessibilityLabel="Yükleniyor" style={s.skeletonWrap}>
        <View style={[s.skeleton, { height: 96 }]} />
        <View style={[s.skeleton, { height: 20 }]} />
        <View style={[s.skeleton, { height: 20, width: "70%" }]} />
      </View>
    );
  }
  return (
    <View style={s.card}>
      <Text style={state === "error" ? s.error : s.body}>{message}</Text>
      {state === "error" && onRetry ? <Btn label="Tekrar dene" onPress={onRetry} /> : null}
    </View>
  );
}

/* ---------------------------------------------------------- persona switch */

const PERSONAS: { persona: Persona; label: string }[] = [
  { persona: "deniz_balanced", label: "Dengeli" },
  { persona: "deniz_risky", label: "Riskli" },
  { persona: "deniz_productive", label: "Üretken" },
];

function PersonaSwitch() {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { user } = useSession();

  async function pick(persona: Persona) {
    setProblem(null);
    try {
      const next = await login(persona);
      setOpen(false);
      router.replace(routeFor(next));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Persona değiştirilemedi.");
    }
  }

  /** Demo shortcut for what Ece does on the web panel. Never ships: `__DEV__` only. */
  async function simulateApprove() {
    setProblem(null);
    const youth = getSession();
    const persona = youth.persona ?? "deniz_balanced";
    if (!youth.user || youth.user.role !== "youth") {
      setProblem("Önce bir genç persona seç.");
      return;
    }
    try {
      const youthId = youth.user.id;
      await login("ece");
      await approveConsent(youthId);
      const next = await login(persona);
      setOpen(false);
      router.replace(routeFor(next));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Onay simülasyonu başarısız.");
    }
  }

  return (
    <View style={s.switchWrap}>
      <Pressable
        onLongPress={() => setOpen((v) => !v)}
        accessibilityRole="header"
        accessibilityLabel="NEXORA"
        accessibilityHint="Demo persona menüsü için uzun bas"
        style={s.brand}
      >
        <View style={s.mark}><View style={s.markInner} /></View>
        <Text style={s.wordmark}>NEXORA</Text>
      </Pressable>
      {open ? (
        <View style={s.menu}>
          <Text style={s.muted}>Demo persona</Text>
          {PERSONAS.map(({ persona, label }) => (
            <Btn
              key={persona}
              label={label}
              variant="ghost"
              onPress={() => void pick(persona)}
              hint={`${label} persona olarak giriş yap`}
            />
          ))}
          {__DEV__ ? (
            <Btn
              label="Veli onayını simüle et"
              variant="ghost"
              onPress={() => void simulateApprove()}
              hint="Ece olarak veli onayı verir"
            />
          ) : null}
          {problem ? <Text style={s.error}>{problem}</Text> : null}
        </View>
      ) : null}
      {user ? <Text style={s.personaName}>{user.displayName}</Text> : <Text style={s.personaName}>Sana ait bir denge</Text>}
    </View>
  );
}

export function Screen({ children, hero, step }: { children: ReactNode; hero?: boolean; step?: number }) {
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.trustStrip}><Text style={s.trustText}>{KVKK_LINE}</Text></View>
        <PersonaSwitch />
        {!hero && step !== undefined ? <Journey current={step} /> : null}
        {children}
        <View style={s.footer}>
          <Text style={s.eyebrow}>KÜÇÜK ADIMLAR, SANA AİT BİR DENGE.</Text>
          <Text style={s.muted}>Yasaklamadan, yargılamadan.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Geist is the measured face; loading it would cost expo-font plus an asset, and
 * the platform grotesques sit close enough at these sizes.
 * ponytail: system sans, swap in Geist the day the app already bundles fonts.
 */
const sans = Platform.select({ ios: "System", android: "sans-serif", default: "system-ui" });

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 20, paddingBottom: 36, width: "100%", maxWidth: 560, alignSelf: "center" },
  switchWrap: { gap: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", paddingVertical: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  mark: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  markInner: { width: 12, height: 12, borderWidth: 2, borderColor: colors.bg, borderRadius: 6 },
  personaName: { color: colors.muted, fontSize: 12, backgroundColor: colors.band, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  trustStrip: { backgroundColor: colors.accent, borderRadius: 12, padding: 12 },
  trustText: { color: colors.bg, fontSize: 12, lineHeight: 18, textAlign: "center" },
  headingBand: { backgroundColor: colors.band, borderRadius: 24, padding: 24, gap: 12 },
  eyebrow: { color: colors.muted, fontSize: 11, lineHeight: 18, fontWeight: "600", letterSpacing: 1.4 },
  subtitle: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.5 },
  tinted: { backgroundColor: colors.tint, borderColor: colors.tint },
  journey: { flexDirection: "row", gap: 8 },
  journeyItem: { flex: 1, gap: 8 },
  journeyLine: { height: 3, backgroundColor: colors.line, borderRadius: 2 },
  journeyActive: { backgroundColor: colors.link },
  journeyLabel: { color: colors.muted, fontSize: 12 },
  journeySelected: { color: colors.text, fontWeight: "700" },
  footer: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 20, marginTop: 12, gap: 4 },
  illustration: { height: 156, borderRadius: 24, overflow: "hidden", backgroundColor: colors.tint, position: "relative", alignItems: "center", justifyContent: "center" },
  illustration_welcome: { backgroundColor: "#E7EEFB" },
  illustration_waiting: { backgroundColor: "#F1EFE9" },
  illustration_balance: { backgroundColor: "#DCE8FA" },
  illustration_coach: { backgroundColor: "#E7EEFB" },
  illustration_done: { backgroundColor: "#DCE8FA" },
  illustrationGlow: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,0.42)", top: -75, right: -25 },
  illustrationOrbit: { position: "absolute", width: 190, height: 74, borderRadius: 100, borderWidth: 1, borderColor: "rgba(11,95,208,0.28)", transform: [{ rotate: "-14deg" }] },
  illustrationSparkOne: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: colors.link, top: 30, left: "23%" },
  illustrationSparkTwo: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text, bottom: 28, right: "20%" },
  illustrationCard: { width: 112, height: 92, borderRadius: 16, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(7,26,49,0.08)", transform: [{ rotate: "-4deg" }], alignItems: "flex-start", justifyContent: "center" },
  illustrationCardTop: { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 4 },
  illustrationDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.link },
  illustrationValue: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: "600", letterSpacing: -1 },
  illustrationLabel: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  numberedRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  number: { color: colors.link, fontSize: 13, fontWeight: "600", lineHeight: 24, width: 24 },
  flexible: { flex: 1 },
  // Tight tracking, weight 500-600: the heading treatment measured off the source.
  wordmark: { color: colors.text, fontFamily: sans, fontSize: 20, fontWeight: "600", letterSpacing: 0.5 },
  wordmarkHero: { color: colors.text, fontFamily: sans, fontSize: 44, fontWeight: "600", letterSpacing: -1 },
  menu: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 12,
    gap: 8,
  },
  title: { color: colors.text, fontFamily: sans, fontSize: 34, lineHeight: 38, fontWeight: "600", letterSpacing: -1.1 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  // danger now clears AA on both backgrounds; the border keeps the state non-colour-only.
  error: {
    color: colors.danger,
    fontSize: 16,
    lineHeight: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    paddingLeft: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  btn: { minHeight: 48, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.accent },
  btnGhost: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  btnTextPrimary: { color: colors.bg, fontSize: 16, fontWeight: "600" },
  btnTextGhost: { color: colors.text, fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  skeletonWrap: { gap: 12 },
  skeleton: { backgroundColor: colors.band, borderRadius: 20 },
});
