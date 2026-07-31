import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/theme";

/**
 * Root navigator. The (tabs) group holds the persistent bottom-dock experience;
 * everything else (Create, Writer, Game, Notifications, Settings, Friend Wall,
 * onboarding) is pushed on top as stack/modal destinations.
 *
 * Fonts: Bricolage Grotesque / Geist / Space Mono .ttf files go in
 * `assets/fonts/` and get wired through `expo-font`'s `useFonts` here before the
 * first paint. Until the binaries are added the app falls back to system fonts.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
