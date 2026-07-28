"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Ensures there's a signed-in Supabase user, creating an anonymous (guest)
 * session if none exists, and writes/updates the matching `users` row so the
 * chat can show a display name. Returns the user id.
 */
export async function ensureGuestSession(displayName: string): Promise<string> {
  const supabase = createClient();

  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    user = data.user;
  }
  if (!user) throw new Error("Could not establish a session");

  await supabase.from("users").upsert({
    id: user.id,
    display_name: displayName || "Guest",
    is_guest: user.is_anonymous ?? true,
  });

  return user.id;
}

/** Kicks off Google OAuth, returning to `next` after the callback. */
export async function signInWithGoogle(next: string) {
  const supabase = createClient();
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
  });
}
