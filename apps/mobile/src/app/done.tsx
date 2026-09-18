import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";

import { Btn, Card, PageHeading, Screen, brand, colors, s, useActiveGate } from "@/ui";

/** The four sparks around the badge, as [x, y] offsets they travel out to. */
const SPARKS: [number, number][] = [
  [-74, -34],
  [70, -42],
  [-58, 40],
  [64, 34],
];

/** Screen 5 — badge + the summary the parent will see. */
export default function Done() {
  useActiveGate();
  const { share } = useLocalSearchParams<{ share?: string }>();

  // One entrance, then the star. Animated is in react-native already; reanimated
  // or lottie would be a dependency for four seconds of motion.
  const intro = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const settle = () => {
      intro.setValue(1);
      spark.setValue(1);
    };
    // Honour the OS setting: motion is a reward here, never the message. The
    // catch matters more than the setting — both values start at 0, which is
    // opacity 0, so a rejected query would leave the badge screen blank.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) return settle();
        Animated.sequence([
          Animated.timing(intro, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.spring(spark, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        ]).start();
      })
      .catch(settle);
    return () => {
      cancelled = true;
    };
  }, [intro, spark]);

  const rise = intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const starScale = spark.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  // Sparks flash on the way out and are gone once the star settles.
  const sparkFade = spark.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] });

  return (
    <Screen>
      <PageHeading title="Görev tamamlandı" body="Küçük bir adım attın. Bu hafta dengeni kendin seçtin." />
      <Animated.View
        style={[x.badge, { opacity: intro, transform: [{ translateY: rise }] }]}
        accessible
        accessibilityLabel="Rozet kazandın: Değerli adım"
      >
        <View style={x.starWrap} accessibilityElementsHidden importantForAccessibility="no">
          {SPARKS.map(([dx, dy]) => (
            <Animated.Text
              key={`${dx},${dy}`}
              style={[
                x.spark,
                {
                  opacity: sparkFade,
                  transform: [
                    { translateX: spark.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                    { translateY: spark.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                    { scale: sparkFade },
                  ],
                },
              ]}
            >
              ✦
            </Animated.Text>
          ))}
          <Animated.Text style={[x.badgeSymbol, { opacity: spark, transform: [{ scale: starScale }] }]}>
            ✦
          </Animated.Text>
        </View>
        <Text style={s.eyebrow}>YENİ ROZETİN</Text>
        <Text style={x.badgeText}>Değerli adım</Text>
        <Text style={s.muted}>Fark ettin. Seçtin. Harekete geçtin.</Text>
      </Animated.View>
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
  starWrap: { height: 76, alignItems: "center", justifyContent: "center" },
  badgeSymbol: { color: brand.blue, fontSize: 64, lineHeight: 72 },
  // Violet, not the logo cyan: cyan on the tinted badge measures 1.1:1 and
  // would flash invisibly. Decorative either way, but visible decoration.
  spark: { position: "absolute", color: brand.violet, fontSize: 18, lineHeight: 20 },
  badgeText: { color: colors.text, fontSize: 28, fontWeight: "600", letterSpacing: -0.8 },
});
