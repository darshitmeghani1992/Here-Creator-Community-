"use client";

import { createClient } from "@/lib/supabase/client";

/** Base URL for auth redirects — always the current origin so it works on
 *  localhost and every deployed domain without depending on an env var. */
function redirectBase() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

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

/** Sends a passwordless magic-link / OTP to `email`. Works with zero extra
 *  Supabase setup (email auth is on by default). `next` is where to land after. */
export async function signInWithEmail(email: string, next = "/studio") {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${redirectBase()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) throw error;
}

/** Kicks off Google OAuth, returning to `next` after the callback. */
export async function signInWithGoogle(next: string) {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${redirectBase()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
}

/**
 * Ensures the current signed-in user has a `users` profile row (creators who
 * sign in via magic link / Google don't get one from the guest flow). Never
 * clobbers an existing row. Returns the user id, or null if signed out.
 */
export async function ensureProfile(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const name =
      (user.user_metadata?.name as string) ||
      (user.email ? user.email.split("@")[0] : "You");
    await supabase.from("users").insert({
      id: user.id,
      display_name: name,
      is_guest: user.is_anonymous ?? false,
    });
  }
  return user.id;
}

/** Signs the current user out and reloads to a clean state. */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
