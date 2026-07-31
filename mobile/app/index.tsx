import { Redirect } from "expo-router";

/**
 * App entry. Phase 1 will branch here on auth state (→ onboarding when signed
 * out). For now it drops straight into the dock's Home tab.
 */
export default function Index() {
  return <Redirect href="/home" />;
}
