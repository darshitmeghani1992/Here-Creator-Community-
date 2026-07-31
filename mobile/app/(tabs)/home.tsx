import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { MarkCard } from "@/components/MarkCard";
import { colors, markColors, spacing } from "@/theme";

/**
 * Home dashboard (Phase 4 fills in the real activity feed). For now it renders
 * the wordmark + a sample mark to exercise the design system end-to-end.
 */
export default function HomeScreen() {
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: spacing.gutter,
          marginBottom: spacing.gutter,
        }}
      >
        <Text variant="display">the wall</Text>
        <Text variant="label" color={colors.outline}>
          // HOME
        </Text>
      </View>

      <Text variant="mark" style={{ marginBottom: 6 }}>
        Good morning, Maya
      </Text>
      <Text variant="body" color={colors.onSurfaceVariant} style={{ marginBottom: 24 }}>
        4 new Marks while you slept
      </Text>

      {/* Active Game card */}
      <MarkCard
        id="active-game"
        background={markColors.roastOrange}
        bordered
        fastener="tape"
      >
        <Text variant="label" color={colors.ink}>
          // ACTIVE GAME
        </Text>
        <Text variant="headline" style={{ marginTop: 6 }}>
          Who Said This?
        </Text>
      </MarkCard>

      <Text variant="label" color={colors.outline} style={{ marginTop: 8 }}>
        RECENT MARKS
      </Text>
      <View style={{ height: 12 }} />

      <MarkCard id="sample-sticky" background={markColors.stickyYellow} fastener="tape">
        <Text variant="mark">you're the reason we always run late 😭</Text>
        <Text variant="label" color={colors.outline} style={{ marginTop: 10 }}>
          — SOFIA
        </Text>
      </MarkCard>
    </Screen>
  );
}
