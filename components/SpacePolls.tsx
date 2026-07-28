"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Creator,
  Poll,
  PollVoteRow,
  PollState,
  PollOptionInput,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { getGuestName } from "@/lib/membership";
import { uploadAttachment } from "@/lib/upload";
import { PollCard } from "@/components/PollCard";
import { CreatePollSheet } from "@/components/CreatePollSheet";

/**
 * The Space's "Polls" tab — a feed of space-level polls (not tied to a room).
 * The creator can launch polls here; everyone votes live.
 */
export function SpacePolls({
  creator,
  initialPolls,
  isOwner,
}: {
  creator: Creator;
  initialPolls: PollState[];
  isOwner: boolean;
}) {
  const supabase = createClient();
  const { user } = useUser();

  const [polls, setPolls] = useState<Poll[]>(initialPolls.map((p) => p.poll));
  const [votesByPoll, setVotesByPoll] = useState<Record<string, PollVoteRow[]>>(
    Object.fromEntries(initialPolls.map((p) => [p.poll.id, p.votes])),
  );
  const [showSheet, setShowSheet] = useState(false);
  const [creating, setCreating] = useState(false);
  const pollIds = useRef<Set<string>>(new Set(initialPolls.map((p) => p.poll.id)));

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const channel = supabase
      .channel(`space-polls:${creator.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "polls",
          filter: `space_id=eq.${creator.id}`,
        },
        (payload) => {
          const p = payload.new as Poll;
          // Only space-level polls (room_id null) belong in this tab.
          if (payload.eventType === "DELETE" || (p && (!p.is_open || p.room_id))) {
            const gone = (payload.old as Poll)?.id ?? p?.id;
            if (gone) {
              pollIds.current.delete(gone);
              setPolls((prev) => prev.filter((x) => x.id !== gone));
            }
            return;
          }
          if (p?.is_open && !p.room_id) {
            pollIds.current.add(p.id);
            setPolls((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
            setVotesByPoll((prev) => (prev[p.id] ? prev : { ...prev, [p.id]: [] }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        (payload) => {
          const v = payload.new as PollVoteRow & { poll_id: string };
          if (!v || !pollIds.current.has(v.poll_id)) return;
          setVotesByPoll((prev) => ({
            ...prev,
            [v.poll_id]: [
              ...(prev[v.poll_id] ?? []).filter((x) => x.user_id !== v.user_id),
              { user_id: v.user_id, option_index: v.option_index },
            ],
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator.id]);

  async function ensureUid(): Promise<string> {
    if (user?.id) {
      const { ensureProfile } = await import("@/lib/auth-client");
      await ensureProfile();
      return user.id;
    }
    const { ensureGuestSession } = await import("@/lib/auth-client");
    return ensureGuestSession(getGuestName() || "Guest");
  }

  async function vote(pollId: string, optionIndex: number) {
    try {
      const uid = await ensureUid();
      setVotesByPoll((prev) => ({
        ...prev,
        [pollId]: [
          ...(prev[pollId] ?? []).filter((v) => v.user_id !== uid),
          { user_id: uid, option_index: optionIndex },
        ],
      }));
      await supabase
        .from("poll_votes")
        .upsert(
          { poll_id: pollId, user_id: uid, option_index: optionIndex },
          { onConflict: "poll_id,user_id" },
        );
    } catch {
      /* ignore */
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const uid = await ensureUid();
    const att = await uploadAttachment(file, creator.id, uid);
    return att.url;
  }

  async function createPoll(question: string, opts: PollOptionInput[]) {
    setCreating(true);
    try {
      const uid = await ensureUid();
      const { data, error } = await supabase
        .from("polls")
        .insert({
          room_id: null,
          space_id: creator.id,
          creator_id: uid,
          question,
          options: opts.map((o) => o.label || "Image"),
          option_images: opts.map((o) => o.image ?? ""),
          is_open: true,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("insert failed");
      const p = data as Poll;
      pollIds.current.add(p.id);
      setPolls((prev) => [p, ...prev]);
      setVotesByPoll((prev) => ({ ...prev, [p.id]: [] }));
      setShowSheet(false);
    } catch {
      /* keep sheet open */
    } finally {
      setCreating(false);
    }
  }

  async function closePoll(pollId: string) {
    pollIds.current.delete(pollId);
    setPolls((prev) => prev.filter((x) => x.id !== pollId));
    await supabase.from("polls").update({ is_open: false }).eq("id", pollId);
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      {isOwner && (
        <div style={{ padding: "14px 18px 4px" }}>
          <button
            onClick={() => setShowSheet(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              minHeight: 44,
              border: "1.5px dashed var(--violet-200)",
              cursor: "pointer",
              background: "var(--violet-100)",
              color: "var(--violet-dk)",
              borderRadius: 16,
              padding: 15,
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New poll
          </button>
        </div>
      )}

      {polls.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
          {polls.map((p) => {
            const votes = votesByPoll[p.id] ?? [];
            const myVote = user
              ? votes.find((v) => v.user_id === user.id)?.option_index ?? null
              : null;
            return (
              <PollCard
                key={p.id}
                poll={p}
                votes={votes}
                myVote={myVote}
                isOwner={isOwner}
                onVote={(i) => vote(p.id, i)}
                onClose={() => closePoll(p.id)}
              />
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>No polls yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {isOwner ? "Tap “New poll” to ask your community something." : "Check back soon."}
          </div>
        </div>
      )}

      {showSheet && isOwner && (
        <CreatePollSheet
          onCreate={createPoll}
          onClose={() => setShowSheet(false)}
          uploadImage={uploadImage}
          busy={creating}
          title="New poll"
        />
      )}
    </div>
  );
}
