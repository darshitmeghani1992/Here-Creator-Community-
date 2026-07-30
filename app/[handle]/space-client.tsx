"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Creator, Room, CreatorLink, PollState, LeaderRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { usePresenceCount } from "@/lib/usePresence";
import { ensureGuestSession, signInWithGoogle } from "@/lib/auth-client";
import {
  hasJoined,
  rememberJoined,
  getGuestName,
  setGuestName,
} from "@/lib/membership";
import { remainingSeconds } from "@/lib/rooms";
import { track } from "@/lib/posthog";
import { resolveAppearance } from "@/lib/appearance";
import { RoomCard } from "@/components/RoomCard";
import { JoinSheet } from "@/components/JoinSheet";
import { CreateRoomSheet } from "@/components/CreateRoomSheet";
import { LinkButton } from "@/components/LinkButton";
import { SpacePolls } from "@/components/SpacePolls";
import { FanStatus } from "@/components/FanStatus";
import { Leaderboard } from "@/components/Leaderboard";
import { Toast } from "@/components/Toast";

export function SpaceClient({
  creator,
  initialRooms,
  initialPolls,
  links,
  leaderOverall,
  leaderWeekly,
  currentUserId,
}: {
  creator: Creator;
  initialRooms: Room[];
  initialPolls: PollState[];
  links: CreatorLink[];
  leaderOverall: LeaderRow[];
  leaderWeekly: LeaderRow[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const isOwner = !!user && creator.owner_id === user.id;

  const appearance = useMemo(
    () => resolveAppearance(creator.theme, creator.appearance),
    [creator.theme, creator.appearance],
  );

  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [now, setNow] = useState(() => Date.now());
  const [overlay, setOverlay] = useState<"join" | "create" | null>(null);
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Stable presence key for the space "online now" count.
  const viewerKey = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "viewer",
  );
  const online = usePresenceCount(`space:${creator.handle}`, {
    key: viewerKey.current,
  });

  useEffect(() => {
    track("space_arrived", { handle: creator.handle });
  }, [creator.handle]);

  // Show a notice when we were bounced here by a room closing, then clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("closed") === "1") {
      showToast("That room has closed.");
      window.history.replaceState({}, "", `/${creator.handle}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick for live countdowns.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime room list: rooms appearing / closing without a refresh.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const channel = supabase
      .channel(`space-rooms:${creator.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rooms",
          filter: `creator_id=eq.${creator.id}`,
        },
        (payload) => {
          const r = payload.new as Room;
          if (!r.is_open) return;
          setRooms((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `creator_id=eq.${creator.id}`,
        },
        (payload) => {
          const r = payload.new as Room;
          setRooms((prev) =>
            r.is_open
              ? prev.map((x) => (x.id === r.id ? r : x))
              : prev.filter((x) => x.id !== r.id),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator.id]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  async function shareSpace() {
    const url = `${window.location.origin}/${creator.handle}`;
    const title = `${creator.display_name}'s Space on HERE`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast("Link copied — share it anywhere");
    } catch {
      /* user dismissed the share sheet, or clipboard blocked */
    }
  }

  // Rooms still open locally (hide the instant a temporary room hits zero;
  // the server cron makes closure authoritative shortly after).
  const openRooms = useMemo(
    () =>
      rooms.filter((r) => {
        if (r.kind !== "temporary") return true;
        const s = remainingSeconds(r.closes_at, now);
        return s === null || s > 0;
      }),
    [rooms, now],
  );

  function enterRoom(room: Room) {
    if (isOwner || hasJoined(room.id)) {
      router.push(`/${creator.handle}/room/${room.id}`);
    } else {
      setPendingRoom(room);
      setOverlay("join");
    }
  }

  async function joinAsGuest(name: string) {
    if (!pendingRoom) return;
    const finalName = name || getGuestName() || "Guest";
    try {
      await ensureGuestSession(finalName);
      setGuestName(finalName);
      rememberJoined(pendingRoom.id);
      track("room_joined", { room_id: pendingRoom.id, method: "guest" });
      const id = pendingRoom.id;
      setOverlay(null);
      router.push(`/${creator.handle}/room/${id}`);
    } catch {
      showToast("Couldn't join — check your connection");
    }
  }

  function joinWithGoogle() {
    if (!pendingRoom) return;
    rememberJoined(pendingRoom.id);
    track("room_joined", { room_id: pendingRoom.id, method: "google" });
    signInWithGoogle(`/${creator.handle}/room/${pendingRoom.id}`);
  }

  async function createRoom(
    name: string,
    seconds: number | null,
    capacity: number | null,
  ) {
    setCreating(true);
    try {
      const closes_at =
        seconds == null ? null : new Date(Date.now() + seconds * 1000).toISOString();
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          creator_id: creator.id,
          name,
          kind: seconds == null ? "permanent" : "temporary",
          closes_at,
          is_open: true,
          capacity,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("insert failed");

      // Seed a creator welcome message so the room isn't empty on arrival.
      if (user) {
        const { ensureProfile } = await import("@/lib/auth-client");
        await ensureProfile(); // creators need a users row before posting
        await supabase.from("messages").insert({
          room_id: data.id,
          user_id: user.id,
          body: "Just opened this room — say hi 👋",
          is_creator: true,
        });
      }

      rememberJoined(data.id);
      track("temporary_room_created", { room_id: data.id, seconds });
      setOverlay(null);
      showToast("Room is live for everyone");
      router.push(`/${creator.handle}/room/${data.id}`);
    } catch {
      showToast("Couldn't create the room");
    } finally {
      setCreating(false);
    }
  }

  const liveRoom = openRooms[0] ?? null;
  const restRooms = openRooms.slice(1);
  const showPolls = isOwner || initialPolls.length > 0;

  return (
    <>
      <StatusBar />
      <div className="hb" style={{ flex: 1, overflowY: "auto", paddingBottom: 28 }}>
        {/* ── Cover ── */}
        <div
          style={{
            height: 132,
            position: "relative",
            background: creator.cover_url
              ? `center/cover no-repeat url(${creator.cover_url})`
              : "linear-gradient(135deg, color-mix(in srgb, var(--violet) 88%, #fff), var(--violet) 55%, color-mix(in srgb, var(--violet) 78%, #000))",
          }}
        >
          {isOwner && (
            <span
              style={{
                position: "absolute",
                top: 12,
                left: 14,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".06em",
                color: "#fff",
                background: "rgba(0,0,0,.28)",
                backdropFilter: "blur(6px)",
                borderRadius: 999,
                padding: "5px 10px",
              }}
            >
              CREATOR
            </span>
          )}
          <button
            onClick={shareSpace}
            aria-label="Share this space"
            style={{
              position: "absolute",
              top: 12,
              right: 14,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,.22)",
              backdropFilter: "blur(6px)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </button>
        </div>

        {/* ── Identity ── */}
        <div style={{ padding: "0 22px", textAlign: "center" }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 26,
              margin: "-46px auto 0",
              padding: 3,
              boxSizing: "border-box",
              background:
                "conic-gradient(from 210deg,#7c3aed,#ec4899,#f59e0b,#0f9d6b,#7c3aed)",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 23,
                overflow: "hidden",
                background: "var(--card)",
                display: "grid",
                placeItems: "center",
                backgroundImage: creator.avatar_url ? `url(${creator.avatar_url})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "3px solid var(--card)",
              }}
            >
              {!creator.avatar_url && (
                <span style={{ fontSize: 34, fontWeight: 800, color: "var(--violet)" }}>
                  {creator.display_name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em", marginTop: 10 }}>
            {creator.display_name}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)" }}>
            @{creator.handle}
          </div>
          {creator.tagline && (
            <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 9 }}>
              {creator.tagline}
            </div>
          )}
          {creator.bio && (
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                margin: "6px auto 0",
                maxWidth: 34 + "ch",
                lineHeight: 1.5,
              }}
            >
              {creator.bio}
            </p>
          )}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginTop: 13,
              background: "var(--green-100)",
              color: "var(--green)",
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--green)",
                animation: "pulseDot 1.1s infinite",
              }}
            />
            {online} here now
          </div>
        </div>

        {/* ── Live bar (rooms) ── */}
        <div style={{ padding: "18px 18px 0" }}>
          {liveRoom ? (
            <button
              onClick={() => enterRoom(liveRoom)}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--on-accent)",
                background:
                  "linear-gradient(120deg, var(--violet), color-mix(in srgb, var(--violet) 80%, #000))",
                borderRadius: 18,
                padding: "15px 16px",
                display: "flex",
                alignItems: "center",
                gap: 13,
                boxShadow: "0 16px 30px -12px color-mix(in srgb, var(--violet) 60%, transparent)",
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--on-accent)",
                  flex: "none",
                  animation: "pulseDot 1.1s infinite",
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".14em", opacity: 0.9 }}>
                  ● LIVE NOW
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "-.01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {liveRoom.name}
                </span>
                <span style={{ display: "block", fontSize: 12, opacity: 0.9, fontWeight: 600 }}>
                  {online} here right now
                </span>
              </span>
              <span
                style={{
                  flex: "none",
                  background: "rgba(255,255,255,.22)",
                  borderRadius: 11,
                  padding: "9px 14px",
                  fontWeight: 800,
                  fontSize: 13.5,
                }}
              >
                Join →
              </span>
            </button>
          ) : (
            <div
              style={{
                width: "100%",
                border: "1px solid var(--line2)",
                background: "var(--card)",
                borderRadius: 18,
                padding: "15px 16px",
                display: "flex",
                alignItems: "center",
                gap: 13,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--violet-100)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 19,
                  flex: "none",
                }}
              >
                🌙
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>
                  No rooms open right now
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  {isOwner ? "Open one below to go live." : "Check back soon."}
                </span>
              </span>
            </div>
          )}

          {isOwner && (
            <button
              onClick={() => setOverlay("create")}
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
                borderRadius: 14,
                padding: 13,
                marginTop: 10,
                fontWeight: 800,
                fontSize: 14.5,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Open a room
            </button>
          )}

          {restRooms.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {restRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  now={now}
                  isOwner={isOwner}
                  onEnter={() => enterRoom(room)}
                  onFull={() => showToast("This room is full — try again soon")}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Fan status + Leaderboard ── */}
        <div style={{ padding: "20px 18px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <FanStatus creatorId={creator.id} handle={creator.handle} />
          <Leaderboard
            overall={leaderOverall}
            weekly={leaderWeekly}
            currentUserId={currentUserId}
          />
        </div>

        {/* ── Links ── */}
        {(links.length > 0 || isOwner) && (
          <div style={{ padding: "22px 18px 0" }}>
            {links.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {links.map((link) => (
                  <LinkButton key={link.id} link={link} appearance={appearance} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  border: "1.5px dashed var(--line2)",
                  borderRadius: 16,
                  padding: "22px 18px",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14.5 }}>
                  Add your links
                </div>
                <div style={{ marginTop: 5 }}>
                  Head to Studio → Appearance to add your music, socials and shop.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Polls ── */}
        {showPolls && (
          <div style={{ paddingTop: 8 }}>
            <SpacePolls creator={creator} initialPolls={initialPolls} isOwner={isOwner} />
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--faint)",
            fontWeight: 600,
            paddingTop: 22,
          }}
        >
          powered by <b style={{ color: "var(--violet)" }}>HERE</b>
        </div>
      </div>

      {overlay === "join" && pendingRoom && (
        <JoinSheet
          roomName={pendingRoom.name}
          initialGuestName={getGuestName()}
          onGoogle={joinWithGoogle}
          onGuest={joinAsGuest}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === "create" && isOwner && (
        <CreateRoomSheet
          onCreate={createRoom}
          onClose={() => setOverlay(null)}
          busy={creating}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  );
}

/** iOS-style status bar strip from the prototype (purely decorative). */
function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 26px",
        fontWeight: 700,
        fontSize: 14,
        position: "relative",
        zIndex: 8,
      }}
    >
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="7" width="3" height="5" rx="1" />
          <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" />
          <rect x="9" y="2" width="3" height="10" rx="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".4" />
        </svg>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <rect x="1" y="1" width="19" height="10" rx="3" stroke="currentColor" strokeOpacity=".5" />
          <rect x="2.5" y="2.5" width="15" height="7" rx="1.6" fill="currentColor" />
          <rect x="21" y="4" width="2" height="4" rx="1" fill="currentColor" fillOpacity=".5" />
        </svg>
      </div>
    </div>
  );
}
