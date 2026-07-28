import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import { ChatClient } from "./chat-client";
import type { Creator, Room, ChatMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: { handle: string; roomId: string };
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("handle", params.handle)
    .maybeSingle();
  if (!creator) notFound();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", params.roomId)
    .eq("creator_id", creator.id)
    .maybeSingle();

  // Closed or missing rooms bounce back to the Space (temporary means temporary).
  if (!room || !room.is_open) {
    redirect(`/${params.handle}?closed=1`);
  }

  const { data: rows } = await supabase
    .from("messages")
    .select(
      "id, room_id, user_id, body, is_creator, created_at, attachment_url, attachment_type, attachment_name, users(display_name)",
    )
    .eq("room_id", params.roomId)
    .order("created_at", { ascending: false })
    .limit(30);

  const initialMessages: ChatMessage[] = ((rows ?? []) as unknown as Array<
    ChatMessage & { users: { display_name: string } | null }
  >)
    .map((m) => ({
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      body: m.body,
      is_creator: m.is_creator,
      created_at: m.created_at,
      attachment_url: m.attachment_url ?? null,
      attachment_type: m.attachment_type ?? null,
      attachment_name: m.attachment_name ?? null,
      author_name: m.users?.display_name ?? null,
    }))
    .reverse();

  return (
    <AppShell>
      <ChatClient
        creator={creator as Creator}
        room={room as Room}
        initialMessages={initialMessages}
      />
    </AppShell>
  );
}
