import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth";
import { colors } from "@/theme";

/**
 * My Wall — placeholder. Phase 2 replaces this with the hero masonry of tilted,
 * pinned marks. For now it confirms the wall exists and links back.
 */
export default function MyWall() {
  const router = useRouter();
  const { profile } = useAuth();
  return (
    <Screen dockInset={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 12 }}>
        <Text variant="label" color={colors.outline}>
          // MY WALL
        </Text>
        <Text variant="display">{profile?.display_name ?? "My"}'s Wall</Text>
        <Text variant="body" color={colors.onSurfaceVariant}>
          The masonry of Marks lands in Phase 2. Your wall and permissions are already live under the hood.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
