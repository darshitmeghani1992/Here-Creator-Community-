import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import { SpaceClient } from "./space-client";
import type { Creator, Room } from "@/lib/types";

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

  return (
    <AppShell>
      <SpaceClient
        creator={creator as Creator}
        initialRooms={(rooms ?? []) as Room[]}
      />
    </AppShell>
  );
}
