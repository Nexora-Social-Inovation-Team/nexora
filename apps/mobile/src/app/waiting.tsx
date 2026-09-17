import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Text } from "react-native";

import { refreshMe, useSession } from "@/api";
import { Btn, Card, Illustration, PageHeading, Screen, s } from "@/ui";

/** Screen 2 — shown while `status === "pending_parent_consent"`. No score is fetched here. */
export default function Waiting() {
  const { user } = useSession();
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await refreshMe();
      setProblem(null);
      if (me.status === "active") router.replace("/score");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Durum alınamadı. Tekrar dene.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <Screen>
      <PageHeading eyebrow="BAŞLAMADAN ÖNCE" title="Veli onayı bekleniyor" body="Hesabın, bir veli onaylayana kadar açılmaz. Veli yalnızca kategori özetlerini görür; tam bağlantı yok." />
      <Illustration kind="waiting" />
      <Card tinted>
        <Text style={s.subtitle}>Güvenle, birlikte başlayalım.</Text>
        <Text style={s.body}>Onay gelene kadar skor ve koç önerileri açılmaz. Ziyaret geçmişin velinle paylaşılmaz.</Text>
      </Card>
      <Card>
        <Text style={s.muted}>Jüri demosu: web panelinden Ece olarak onayla.</Text>
      </Card>
      <Btn label="Durumu yenile" onPress={() => void refresh()} hint="Veli onayını yeniden sorgular" />
      {user ? <Text style={s.muted}>Onay geldiğinde yolculuğuna devam edebilirsin.</Text> : null}
      {problem ? <Text style={s.error}>{problem}</Text> : null}
    </Screen>
  );
}
