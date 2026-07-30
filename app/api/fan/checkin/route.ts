import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkinFan } from "@/lib/points";

export const dynamic = "force-dynamic";

/**
 * Daily fan check-in. Identifies the caller from their session cookie; only
 * real (non-anonymous) accounts can earn — guests get `signedIn: false` so the
 * UI can prompt sign-in. Delegates all writes to the server points engine.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const creatorId = body?.creatorId as string | undefined;
  if (!creatorId) {
    return NextResponse.json({ error: "missing creatorId" }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ signedIn: false, unavailable: true });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return NextResponse.json({ signedIn: false });
  }

  const displayName =
    (user.user_metadata?.name as string) ||
    (user.email ? user.email.split("@")[0] : "Fan");

  try {
    const status = await checkinFan(creatorId, user.id, displayName);
    return NextResponse.json({ signedIn: true, ...status });
  } catch {
    return NextResponse.json({ error: "checkin failed" }, { status: 500 });
  }
}
