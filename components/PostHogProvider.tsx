"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/posthog";

/** Boots PostHog on mount (no-op without a key). Wraps the whole app. */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);
  return <>{children}</>;
}
