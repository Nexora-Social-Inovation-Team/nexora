import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { login } from "@/api";
import { Btn, Card, Illustration, Journey, PageHeading, Screen, routeFor, s } from "@/ui";

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
      <PageHeading eyebrow="SENİN ZAMANIN. SENİN DENGEN." title={"Dijital dünyada,\nkendine yer aç."} body="Sosyal medyayı ölç, anla, küçük bir adım at." />
      <Illustration kind="welcome" />
      <Card tinted>
        <Text style={s.eyebrow}>BİR KÜÇÜK ADIMLA BAŞLAR</Text>
        <Text style={s.subtitle}>Daha çok fark et. Kendin için üret.</Text>
        <Journey current={0} />
        <Text style={s.muted}>Kategori özetlerini keşfet, dengeni anla ve sana uygun kısa bir görev seç.</Text>
      </Card>
      <View style={s.numberedRow}>
        <Text style={s.number}>01</Text>
        <Text style={[s.muted, s.flexible]}>Önce veli onayı. Sonra yalnızca kategori özetleriyle sana ait bir yolculuk.</Text>
      </View>
      <Btn label="Katıl" onPress={() => void join()} hint="Demo hesabıyla katıl" />
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
