import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/ui";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          // A cross-fade rather than a platform slide: the five screens are one
          // continuous journey, not a stack the youth pushes and pops.
          animation: "fade",
        }}
      />
    </SafeAreaProvider>
  );
}
