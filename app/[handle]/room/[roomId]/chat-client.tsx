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
import { uploadAttachment, type Attachment } from "@/lib/upload";
import type { AttachmentType } from "@/lib/types";

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
  const [pending, setPending] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Guarantee a signed-in (guest) session so Storage + message RLS let us write.
  async function ensureUid(): Promise<string> {
    if (user?.id) return user.id;
    const { ensureGuestSession } = await import("@/lib/auth-client");
    return ensureGuestSession(getGuestName() || "Guest");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    setAttachError(null);
    setUploading(true);
    try {
      const uid = await ensureUid();
      const att = await uploadAttachment(file, room.id, uid);
      setPending(att);
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    const body = draft.trim();
    const attach = pending;
    if (!body && !attach) return;
    setDraft("");
    setPending(null);
    try {
      const uid = await ensureUid();
      await supabase.from("messages").insert({
        room_id: room.id,
        user_id: uid,
        body,
        is_creator: isOwner,
        attachment_url: attach?.url ?? null,
        attachment_type: attach?.type ?? null,
        attachment_name: attach?.name ?? null,
      });
      if (!sentFirst) {
        setSentFirst(true);
        track("first_message_sent", { room_id: room.id });
      }
    } catch {
      setDraft(body); // restore on failure
      setPending(attach);
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
          const att: Attachment | null = m.attachment_url
            ? {
                url: m.attachment_url,
                type: (m.attachment_type ?? "file") as AttachmentType,
                name: m.attachment_name ?? "file",
              }
            : null;
          const isYou = !!user && m.user_id === user.id;
          if (isYou) return <YouBubble key={m.id} text={m.body} attachment={att} />;
          if (m.is_creator)
            return (
              <CreatorBubble
                key={m.id}
                name={creator.display_name}
                text={m.body}
                attachment={att}
              />
            );
          return (
            <FanBubble
              key={m.id}
              name={m.author_name ?? "Guest"}
              text={m.body}
              attachment={att}
            />
          );
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
        {/* Pending attachment / upload status */}
        {(pending || uploading || attachError) && (
          <div style={{ marginBottom: 8 }}>
            {uploading && (
              <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
                Uploading…
              </div>
            )}
            {attachError && (
              <div style={{ fontSize: 12.5, color: "var(--red)", fontWeight: 600 }}>
                {attachError}
              </div>
            )}
            {pending && !uploading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid var(--line2)",
                  background: "var(--card)",
                  borderRadius: 12,
                  padding: 8,
                }}
              >
                {pending.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pending.url}
                    alt={pending.name}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 22 }}>
                    {pending.type === "video" ? "🎬" : "📎"}
                  </span>
                )}
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {pending.name}
                </span>
                <button
                  onClick={() => setPending(null)}
                  aria-label="Remove attachment"
                  style={{
                    flex: "none",
                    border: "none",
                    background: "var(--bg)",
                    borderRadius: 8,
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    color: "var(--muted)",
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.zip,.csv,.xlsx,.ppt,.pptx"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Attach a photo, video or file"
            style={{
              flex: "none",
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "1px solid var(--line2)",
              background: "var(--card)",
              display: "grid",
              placeItems: "center",
              cursor: uploading ? "default" : "pointer",
              opacity: uploading ? 0.5 : 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
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

/** Renders an image / video / file attachment inside a message bubble. */
function AttachmentView({ att }: { att: Attachment }) {
  if (att.type === "image") {
    return (
      <a href={att.url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={att.url}
          alt={att.name}
          style={{
            display: "block",
            width: 240,
            maxWidth: "72vw",
            maxHeight: 300,
            objectFit: "cover",
            borderRadius: 14,
            border: "1px solid var(--line2)",
          }}
        />
      </a>
    );
  }
  if (att.type === "video") {
    return (
      <video
        src={att.url}
        controls
        playsInline
        style={{
          display: "block",
          width: 240,
          maxWidth: "72vw",
          borderRadius: 14,
          background: "#000",
        }}
      />
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noreferrer"
      download={att.name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        border: "1px solid var(--line2)",
        background: "var(--card)",
        borderRadius: 12,
        padding: "10px 12px",
        maxWidth: 240,
      }}
    >
      <span style={{ fontSize: 20 }}>📎</span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 700,
          fontSize: 13,
          color: "var(--ink)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {att.name}
      </span>
    </a>
  );
}

function CreatorBubble({
  name,
  text,
  attachment,
}: {
  name: string;
  text: string;
  attachment?: Attachment | null;
}) {
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
      {attachment && (
        <div style={{ marginBottom: text ? 6 : 0 }}>
          <AttachmentView att={attachment} />
        </div>
      )}
      {text && (
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
      )}
    </div>
  );
}

function FanBubble({
  name,
  text,
  attachment,
}: {
  name: string;
  text: string;
  attachment?: Attachment | null;
}) {
  return (
    <div style={{ animation: "msgIn .22s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--line2)" }} />
        <span style={{ fontWeight: 700, fontSize: 12.5 }}>{name}</span>
      </div>
      {attachment && (
        <div style={{ marginBottom: text ? 6 : 0 }}>
          <AttachmentView att={attachment} />
        </div>
      )}
      {text && (
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
      )}
    </div>
  );
}

function YouBubble({
  text,
  attachment,
}: {
  text: string;
  attachment?: Attachment | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        animation: "msgIn .22s ease",
      }}
    >
      {attachment && <AttachmentView att={attachment} />}
      {text && (
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
      )}
    </div>
  );
}
