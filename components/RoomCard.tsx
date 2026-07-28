"use client";

import type { Room } from "@/lib/types";
import { roomVisual, remainingSeconds, formatCountdown } from "@/lib/rooms";
import { usePresenceCount } from "@/lib/usePresence";
import { RoomIcon } from "@/components/RoomIcon";

/**
 * A single room row on the Space. Live "N here" comes from real presence on the
 * room's channel (read passively — a Space viewer isn't counted as inside).
 * The temporary-room tag counts down using the ticking `now` from the parent.
 */
export function RoomCard({
  room,
  now,
  onEnter,
}: {
  room: Room;
  now: number;
  onEnter: () => void;
}) {
  const { icon, chipBg } = roomVisual(room);
  const members = usePresenceCount(`room:${room.id}`, null);
  const temp = room.kind === "temporary";
  const secs = remainingSeconds(room.closes_at, now);

  const tagText = temp ? `CLOSES IN ${formatCountdown(secs)}` : "ALWAYS OPEN";
  const tagStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".03em",
    padding: "6px 10px",
    borderRadius: 8,
    flex: "none",
    textAlign: "center",
    lineHeight: 1.2,
    color: temp ? "var(--orange)" : "var(--green)",
    background: temp ? "var(--orange-100)" : "var(--green-100)",
  };

  return (
    <button
      onClick={onEnter}
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        background: "var(--card)",
        border: `1px solid ${temp ? "var(--line2)" : "var(--line)"}`,
        borderRadius: 18,
        padding: "15px 16px",
        boxShadow: "0 4px 16px rgba(124,58,237,.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div
          style={{
            width: 46,
            height: 46,
            flex: "none",
            borderRadius: 13,
            background: chipBg,
            display: "grid",
            placeItems: "center",
            color: "#fff",
          }}
        >
          <RoomIcon name={icon} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{room.name}</div>
          <div
            style={{
              fontSize: 12.5,
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
                animation: "pulseDot 1.3s infinite",
              }}
            />
            {members} here
          </div>
        </div>
        <span style={tagStyle}>{tagText}</span>
      </div>
    </button>
  );
}
