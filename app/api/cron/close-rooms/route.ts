import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Auto-close sweep. Sets is_open = false on every temporary room whose timer
 * has elapsed. Driven by Vercel Cron (see vercel.json) — daily on the free
 * Hobby plan (bump to a tighter schedule on Pro). This is background cleanup of
 * the DB flag; the UI already hides/bounces expired rooms immediately client-
 * side, so "temporary means temporary" holds regardless of the sweep interval.
 *
 * Auth: requires `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends this
 * automatically when CRON_SECRET is set as a project env var.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "service role key not configured" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .update({ is_open: false })
    .eq("is_open", true)
    .eq("kind", "temporary")
    .lt("closes_at", new Date().toISOString())
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ closed: data?.length ?? 0 });
}
