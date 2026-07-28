"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (singleton). Reads the public env at runtime.
 * Realtime, anonymous auth, OAuth, and message inserts all flow through this.
 * Left untyped at the schema level; call sites cast rows to lib/types.
 */
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
