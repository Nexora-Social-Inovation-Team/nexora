import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { login } from "@/api";
import { Btn, Card, KVKK_LINE, Screen, routeFor, s } from "@/ui";

/** Screen 1 — onboarding. Copy: docs/DESIGN.md "1. Onboarding / katılım". */
export default function Onboarding() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function join() {
    setProblem(null);
    try {
      router.replace(routeFor(await login("deniz_balanced")));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Giriş yapılamadı. Tekrar dene.");
    }
  }

  return (
    <Screen hero>
      <Text style={s.body}>Sosyal medyayı ölç, anla, küçük bir adım at.</Text>
      <Btn label="Katıl" onPress={() => void join()} hint="Demo hesabıyla katıl" />
      <Text style={s.muted}>{KVKK_LINE}</Text>
      <Btn
        label="Verilerim nasıl kullanılır?"
        variant="ghost"
        onPress={() => setPrivacyOpen((open) => !open)}
      />
      {privacyOpen ? (
        <Card>
          <Text style={s.body}>
            Yalnızca kategori dakikaları toplanır: bilim, sanat, spor, kültür, girişimcilik, millî
            hafıza, eğlence ve zararlı. Ham bağlantı, sayfa içeriği, mesaj, arama kaydı ve form
            alanları hiçbir zaman toplanmaz.
          </Text>
          <Text style={s.body}>
            Veli yalnızca kategori özetlerini görür; ziyaret geçmişini görmez. Onay geri çekilirse
            yeni işleme durur ve veriler 30 gün içinde silinir.
          </Text>
        </Card>
      ) : null}
      {problem ? <Text style={s.error}>{problem}</Text> : null}
    </Screen>
  );
}
