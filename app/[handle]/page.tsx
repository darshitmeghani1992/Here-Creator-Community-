import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import { SpaceClient } from "./space-client";
import type {
  Creator,
  Room,
  Poll,
  PollVoteRow,
  PollState,
  CreatorLink,
  LeaderRow,
} from "@/lib/types";

// Always render fresh so the SSR'd room list reflects the live DB state.
export const dynamic = "force-dynamic";

export default async function SpacePage({
  params,
}: {
  params: { handle: string };
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("handle", params.handle)
    .maybeSingle();

  if (!creator) notFound();

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("creator_id", creator.id)
    .eq("is_open", true)
    .order("created_at", { ascending: true });

  // Link-in-bio links, in the creator's chosen order.
  const { data: linkRows } = await supabase
    .from("creator_links")
    .select("*")
    .eq("creator_id", creator.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  // Space-level polls (not tied to a room) for the Polls tab.
  const { data: pollRows } = await supabase
    .from("polls")
    .select("*")
    .eq("space_id", creator.id)
    .is("room_id", null)
    .eq("is_open", true)
    .order("created_at", { ascending: false });

  let initialPolls: PollState[] = [];
  if (pollRows?.length) {
    const ids = (pollRows as Poll[]).map((p) => p.id);
    const { data: allVotes } = await supabase
      .from("poll_votes")
      .select("poll_id, option_index, user_id")
      .in("poll_id", ids);
    const rows = (allVotes ?? []) as (PollVoteRow & { poll_id: string })[];
    initialPolls = (pollRows as Poll[]).map((p) => ({
      poll: p,
      votes: rows
        .filter((v) => v.poll_id === p.id)
        .map((v) => ({ option_index: v.option_index, user_id: v.user_id })),
    }));
  }

  // ── Fan leaderboards (overall + weekly) ──
  const [{ data: topFans }, { data: weeklyRows }, { data: authData }] =
    await Promise.all([
      supabase
        .from("fans")
        .select("user_id, points, level")
        .eq("creator_id", creator.id)
        .order("points", { ascending: false })
        .limit(20),
      supabase.rpc("weekly_leaderboard", {
        cid: creator.id,
        since: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      }),
      supabase.auth.getUser(),
    ]);

  const overallRaw = (topFans ?? []) as { user_id: string; points: number; level: number }[];
  const weeklyRaw = (weeklyRows ?? []) as { user_id: string; points: number }[];

  const ids = Array.from(
    new Set([...overallRaw.map((r) => r.user_id), ...weeklyRaw.map((r) => r.user_id)]),
  );
  const profiles: Record<string, { display_name: string; avatar_url: string | null }> = {};
  if (ids.length) {
    const { data: us } = await supabase
      .from("users")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    for (const u of (us ?? []) as { id: string; display_name: string; avatar_url: string | null }[]) {
      profiles[u.id] = { display_name: u.display_name, avatar_url: u.avatar_url };
    }
  }
  const nameOf = (id: string) => profiles[id]?.display_name ?? "Fan";
  const avatarOf = (id: string) => profiles[id]?.avatar_url ?? null;

  const leaderOverall: LeaderRow[] = overallRaw.map((r) => ({
    user_id: r.user_id,
    display_name: nameOf(r.user_id),
    avatar_url: avatarOf(r.user_id),
    points: r.points,
    level: r.level,
  }));
  const leaderWeekly: LeaderRow[] = weeklyRaw.map((r) => ({
    user_id: r.user_id,
    display_name: nameOf(r.user_id),
    avatar_url: avatarOf(r.user_id),
    points: Number(r.points),
  }));

  const currentUserId =
    authData?.user && !authData.user.is_anonymous ? authData.user.id : null;

  return (
    <AppShell
      theme={(creator as Creator).theme}
      appearance={(creator as Creator).appearance}
    >
      <SpaceClient
        creator={creator as Creator}
        initialRooms={(rooms ?? []) as Room[]}
        initialPolls={initialPolls}
        links={(linkRows ?? []) as CreatorLink[]}
        leaderOverall={leaderOverall}
        leaderWeekly={leaderWeekly}
        currentUserId={currentUserId}
      />
    </AppShell>
  );
}
