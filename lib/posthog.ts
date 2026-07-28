"use client";

import posthog from "posthog-js";

/**
 * Thin PostHog wrapper. Every call is a no-op unless NEXT_PUBLIC_POSTHOG_KEY
 * is set, so the funnel instrumentation never breaks local/dev without a key.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let started = false;

export function initPostHog() {
  if (started || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    person_profiles: "identified_only",
  });
  started = true;
}

/** The three funnel events the MVP tracks: arrival → join → first message. */
export type HereEvent =
  | "space_arrived"
  | "room_joined"
  | "first_message_sent"
  | "temporary_room_created";

export function track(event: HereEvent, props?: Record<string, unknown>) {
  if (!KEY) return;
  posthog.capture(event, props);
}
