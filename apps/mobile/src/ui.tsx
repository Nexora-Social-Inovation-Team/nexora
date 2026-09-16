import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CategoryId, Persona, User } from "@nexora/shared";

import { approveConsent, getSession, login, useSession } from "./api";

/** docs/DESIGN.md "Visual tokens". Score meaning is never encoded as colour. */
export const colors = {
  bg: "#0F1412",
  surface: "#1A221C",
  text: "#F4F1EA",
  muted: "#A7B0A1",
  accent: "#C4F542",
  warn: "#E4B44C",
  danger: "#D45D4A",
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

export const routeFor = (user: User): string =>
  user.status === "active" ? "/score" : "/waiting";

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

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
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

function PersonaSwitch({ hero }: { hero?: boolean }) {
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
      >
        <Text style={hero ? s.wordmarkHero : s.wordmark}>NEXORA</Text>
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
      {user ? <Text style={s.muted}>{user.displayName}</Text> : null}
    </View>
  );
}

export function Screen({ children, hero }: { children: ReactNode; hero?: boolean }) {
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.content}>
        <PersonaSwitch hero={hero} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  switchWrap: { gap: 8 },
  wordmark: { color: colors.text, fontFamily: serif, fontSize: 20, letterSpacing: 4 },
  wordmarkHero: { color: colors.text, fontFamily: serif, fontSize: 40, letterSpacing: 8 },
  menu: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 8 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 },
  btn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" },
  btnPrimary: { backgroundColor: colors.accent },
  btnGhost: { borderWidth: 1, borderColor: colors.muted },
  btnTextPrimary: { color: colors.bg, fontSize: 16, fontWeight: "700" },
  btnTextGhost: { color: colors.text, fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  skeletonWrap: { gap: 12 },
  skeleton: { backgroundColor: colors.surface, borderRadius: 12 },
});
