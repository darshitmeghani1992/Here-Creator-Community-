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
      />
    </AppShell>
  );
}
