"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Creator, Room, ChatMessage } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { usePresenceCount } from "@/lib/usePresence";
import { getGuestName } from "@/lib/membership";
import { remainingSeconds, formatCountdown } from "@/lib/rooms";
import { track } from "@/lib/posthog";

type FloatReaction = { id: number; left: number; emoji: string };

const REACTIONS: { key: string; emoji: string }[] = [
  { key: "flame", emoji: "🔥" },
  { key: "heart", emoji: "❤️" },
  { key: "clap", emoji: "👏" },
];

export function ChatClient({
  creator,
  room,
  initialMessages,
}: {
  creator: Creator;
  room: Room;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const isOwner = !!user && creator.owner_id === user.id;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [reactions, setReactions] = useState<FloatReaction[]>([]);
  const [sentFirst, setSentFirst] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nameCache = useRef<Map<string, string>>(new Map());
  const reactionId = useRef(0);

  // Stable presence identity for this occupant.
  const selfKey = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "me",
  );
  const here = usePresenceCount(`room:${room.id}`, { key: selfKey.current });

  const temp = room.kind === "temporary";
  const secs = remainingSeconds(room.closes_at, now);

  // Seed the author-name cache from the SSR'd messages.
  useEffect(() => {
    for (const m of initialMessages) {
      if (m.user_id && m.author_name) nameCache.current.set(m.user_id, m.author_name);
    }
  }, [initialMessages]);

  // Countdown tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Bounce out the moment a temporary room's timer expires.
  useEffect(() => {
    if (temp && secs !== null && secs <= 0) {
      router.replace(`/${creator.handle}?closed=1`);
    }
  }, [temp, secs, creator.handle, router]);

  // Auto-scroll to newest.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Realtime: new messages + this room closing.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const channel = supabase
      .channel(`room-msgs:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        async (payload) => {
          const m = payload.new as ChatMessage;
          let author_name: string | null = null;
          if (m.user_id) {
            author_name = nameCache.current.get(m.user_id) ?? null;
            if (!author_name) {
              const { data } = await supabase
                .from("users")
                .select("display_name")
                .eq("id", m.user_id)
                .maybeSingle();
              author_name = data?.display_name ?? null;
              if (author_name) nameCache.current.set(m.user_id, author_name);
            }
          }
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { ...m, author_name }].slice(-60),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if (!(payload.new as Room).is_open) {
            router.replace(`/${creator.handle}?closed=1`);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      // Guarantee a session (guest) so RLS lets the insert through.
      let uid = user?.id;
      if (!uid) {
        const { ensureGuestSession } = await import("@/lib/auth-client");
        uid = await ensureGuestSession(getGuestName() || "Guest");
      }
      await supabase.from("messages").insert({
        room_id: room.id,
        user_id: uid,
        body,
        is_creator: isOwner,
      });
      if (!sentFirst) {
        setSentFirst(true);
        track("first_message_sent", { room_id: room.id });
      }
    } catch {
      setDraft(body); // restore on failure
    }
  }

  function react(emoji: string) {
    const id = ++reactionId.current;
    const left = 12 + Math.random() * 72;
    setReactions((prev) => [...prev, { id, left, emoji }]);
    setTimeout(
      () => setReactions((prev) => prev.filter((r) => r.id !== id)),
      2600,
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--card)",
      }}
    >
      {/* Header */}
      <div
        style={{
          flex: "none",
          padding: "11px 15px",
          display: "flex",
          alignItems: "center",
          gap: 11,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => router.push(`/${creator.handle}`)}
          aria-label="Back to space"
          style={{
            width: 40,
            height: 40,
            flex: "none",
            borderRadius: 12,
            border: "none",
            background: "var(--bg)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.2">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{room.name}</div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
                animation: "pulseDot 1.1s infinite",
              }}
            />
            {here} here
            {temp && (
              <span style={{ color: "var(--orange)", fontWeight: 700 }}>
                · closes in {formatCountdown(secs)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="hb"
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 15px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 13,
        }}
      >
        <div
          style={{
            alignSelf: "center",
            background: "var(--bg)",
            border: "1px solid var(--line2)",
            color: "var(--muted)",
            fontWeight: 700,
            fontSize: 12.5,
            padding: "8px 15px",
            borderRadius: 999,
          }}
        >
          You joined {room.name}.
        </div>

        {messages.map((m) => {
          const isYou = !!user && m.user_id === user.id;
          if (isYou) return <YouBubble key={m.id} text={m.body} />;
          if (m.is_creator)
            return <CreatorBubble key={m.id} name={creator.display_name} text={m.body} />;
          return <FanBubble key={m.id} name={m.author_name ?? "Guest"} text={m.body} />;
        })}
      </div>

      {/* Floating reactions */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 130,
          height: 1,
          pointerEvents: "none",
        }}
      >
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{
              position: "absolute",
              bottom: 0,
              left: `${r.left}%`,
              fontSize: 26,
              animation: "floatUp 2.6s ease-out forwards",
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div
        style={{
          flex: "none",
          borderTop: "1px solid var(--line)",
          background: "var(--bg)",
          padding: "10px 14px calc(14px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => react(r.emoji)}
              aria-label={`React ${r.emoji}`}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line2)",
                borderRadius: 999,
                width: 44,
                height: 38,
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              {r.emoji}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder={`Message ${room.name}…`}
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px solid var(--line2)",
              background: "var(--card)",
              borderRadius: 999,
              padding: "12px 16px",
              outline: "none",
              fontFamily: "var(--font-inter)",
              fontSize: 14,
              color: "var(--ink)",
            }}
          />
          <button
            onClick={send}
            style={{
              flex: "none",
              border: "none",
              cursor: "pointer",
              background: "var(--violet)",
              color: "#fff",
              borderRadius: 999,
              padding: "12px 22px",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatorBubble({ name, text }: { name: string; text: string }) {
  return (
    <div style={{ animation: "msgIn .22s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "conic-gradient(from 210deg,#7c3aed,#ec4899,#f59e0b,#7c3aed)",
            padding: 1.5,
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--muted)" }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 12.5, color: "var(--violet)" }}>{name}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: ".04em",
            background: "var(--violet-100)",
            color: "var(--violet)",
            padding: "2px 6px",
            borderRadius: 5,
          }}
        >
          CREATOR
        </span>
      </div>
      <div
        style={{
          maxWidth: "82%",
          background: "var(--violet-100)",
          border: "1px solid var(--violet-200)",
          borderRadius: "4px 16px 16px 16px",
          padding: "11px 14px",
          fontWeight: 600,
          fontSize: 14.5,
          lineHeight: 1.4,
          color: "var(--violet-700)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function FanBubble({ name, text }: { name: string; text: string }) {
  return (
    <div style={{ animation: "msgIn .22s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--line2)" }} />
        <span style={{ fontWeight: 700, fontSize: 12.5 }}>{name}</span>
      </div>
      <div
        style={{
          maxWidth: "82%",
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "4px 16px 16px 16px",
          padding: "11px 14px",
          fontSize: 14.5,
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function YouBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", animation: "msgIn .22s ease" }}>
      <div
        style={{
          maxWidth: "82%",
          background: "var(--violet)",
          color: "#fff",
          borderRadius: "16px 16px 4px 16px",
          padding: "11px 14px",
          fontSize: 14.5,
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
}
