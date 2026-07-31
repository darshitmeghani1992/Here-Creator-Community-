import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { colors } from "@/theme";

/** Profile — avatar, stats, edit, settings entry. Built out in Phase 4. */
export default function ProfileScreen() {
  return (
    <Screen>
      <Text variant="display" style={{ marginVertical: 20 }}>
        Profile
      </Text>
      <Text variant="body" color={colors.onSurfaceVariant}>
        Your profile, stats, and settings arrive in Phase 4–5.
      </Text>
    </Screen>
  );
}
