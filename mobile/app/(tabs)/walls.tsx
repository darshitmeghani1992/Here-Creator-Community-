import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { colors } from "@/theme";

/** Walls hub — "MY STORY" + "OUR STORY · V3" teaser. Built out in Phase 4. */
export default function WallsScreen() {
  return (
    <Screen>
      <Text variant="display" style={{ marginVertical: 20 }}>
        Your Walls
      </Text>
      <Text variant="label" color={colors.outline}>
        MY STORY
      </Text>
      <View style={{ height: 8 }} />
      <Text variant="body" color={colors.onSurfaceVariant}>
        Personal Wall coming together in Phase 4.
      </Text>
    </Screen>
  );
}
