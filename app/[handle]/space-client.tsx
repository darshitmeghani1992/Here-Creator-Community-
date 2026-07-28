"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Creator, Room } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { usePresenceCount } from "@/lib/usePresence";
import {
  ensureGuestSession,
  signInWithGoogle,
} from "@/lib/auth-client";
import {
  hasJoined,
  rememberJoined,
  getGuestName,
  setGuestName,
} from "@/lib/membership";
import { remainingSeconds } from "@/lib/rooms";
import { track } from "@/lib/posthog";
import { RoomCard } from "@/components/RoomCard";
import { JoinSheet } from "@/components/JoinSheet";
import { CreateRoomSheet } from "@/components/CreateRoomSheet";
import { Toast } from "@/components/Toast";

export function SpaceClient({
  creator,
  initialRooms,
}: {
  creator: Creator;
  initialRooms: Room[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const isOwner = !!user && creator.owner_id === user.id;

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

  async function createRoom(name: string, seconds: number | null) {
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
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("insert failed");

      // Seed a creator welcome message so the room isn't empty on arrival.
      if (user) {
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

  return (
    <>
      <StatusBar />
      <div className="hb" style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        {/* Header */}
        <div
          style={{
            padding: "6px 18px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background:
                "conic-gradient(from 210deg,#7c3aed,#ec4899,#f59e0b,#0f9d6b,#7c3aed)",
              padding: 2,
              boxSizing: "border-box",
              flex: "none",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--muted)",
                backgroundImage: creator.avatar_url
                  ? `url(${creator.avatar_url})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: -1,
                bottom: -1,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "var(--green)",
                border: "2px solid var(--bg)",
              }}
            />
          </div>
          <div style={{ flex: 1, lineHeight: 1.15 }}>
            <div style={{ fontWeight: 800, fontSize: 19 }}>
              {creator.display_name}&apos;s Space
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--green)",
                display: "flex",
                alignItems: "center",
                gap: 5,
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
              {online} online now
            </div>
          </div>
          {isOwner && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".05em",
                color: "var(--violet)",
                background: "var(--violet-100)",
                borderRadius: 999,
                padding: "5px 10px",
              }}
            >
              CREATOR
            </span>
          )}
        </div>

        {/* Rooms */}
        <div style={{ padding: "16px 18px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>Rooms open now</div>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {openRooms.length} live
            </span>
          </div>

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
                borderRadius: 16,
                padding: 15,
                marginBottom: 12,
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New temporary room
            </button>
          )}

          {openRooms.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {openRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  now={now}
                  onEnter={() => enterRoom(room)}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>
                It&apos;s quiet right now
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                No open rooms. Check back soon
                {isOwner ? " — or open one above." : "."}
              </div>
            </div>
          )}
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
