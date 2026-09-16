import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Btn, Card, Screen, colors, s, useActiveGate } from "@/ui";

/** Screen 5 — badge + the summary the parent will see. */
export default function Done() {
  useActiveGate();
  const { share } = useLocalSearchParams<{ share?: string }>();

  return (
    <Screen>
      <Text style={s.title}>Görev tamamlandı</Text>
      <View style={x.badge} accessible accessibilityLabel="Rozet kazandın: Değerli adım">
        <Text style={x.badgeText}>Değerli adım</Text>
      </View>
      <Text style={s.body}>Küçük bir adım attın. Bu hafta dengeni kendin seçtin.</Text>
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
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  badgeText: { color: colors.accent, fontSize: 18, fontWeight: "700" },
});
