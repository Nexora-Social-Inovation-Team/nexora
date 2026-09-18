import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Btn, Card, PageHeading, Screen, colors, s, useActiveGate } from "@/ui";

/** Screen 5 — badge + the summary the parent will see. */
export default function Done() {
  useActiveGate();
  const { share } = useLocalSearchParams<{ share?: string }>();

  return (
    <Screen>
      <PageHeading title="Görev tamamlandı" body="Küçük bir adım attın. Bu hafta dengeni kendin seçtin." />
      <View style={x.badge} accessible accessibilityLabel="Rozet kazandın: Değerli adım">
        <Text style={x.badgeSymbol} accessibilityElementsHidden importantForAccessibility="no">✦</Text>
        <Text style={s.eyebrow}>YENİ ROZETİN</Text>
        <Text style={x.badgeText}>Değerli adım</Text>
        <Text style={s.muted}>Fark ettin. Seçtin. Harekete geçtin.</Text>
      </View>
      {share ? (
        <>
          <Text style={s.muted}>Velinle paylaşılacak özet</Text>
          <Card>
            <Text style={s.body}>{share}</Text>
          </Card>
        </>
      ) : null}
      <Btn
        label="Panele yansısın"
        onPress={() => router.replace("/score")}
        hint="Tamamladığın görev veli panelinde görünür"
      />
    </Screen>
  );
}

const x = StyleSheet.create({
  badge: {
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.tint,
    backgroundColor: colors.tint,
    padding: 28,
  },
  badgeSymbol: { color: colors.link, fontSize: 64 },
  badgeText: { color: colors.text, fontSize: 28, fontWeight: "600", letterSpacing: -0.8 },
});
