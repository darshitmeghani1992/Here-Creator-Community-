"use client";

import { useState } from "react";

/** Duration options → seconds (null = permanent). Matches the prototype. */
const DURATIONS: { label: string; seconds: number | null }[] = [
  { label: "1 hour", seconds: 3600 },
  { label: "3 hours", seconds: 10800 },
  { label: "Permanent", seconds: null },
];

/**
 * Creator-only bottom sheet to open a temporary (or permanent) room.
 * Name + duration chips → create & go live.
 */
export function CreateRoomSheet({
  onCreate,
  onClose,
  busy,
}: {
  onCreate: (name: string, seconds: number | null, capacity: number | null) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [name, setName] = useState("");
  const [seconds, setSeconds] = useState<number | null>(3600);
  const [limited, setLimited] = useState(false);
  const [capacity, setCapacity] = useState(50);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(20,16,30,.42)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "flex-end",
        animation: "fadeIn .2s ease",
        zIndex: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--card)",
          borderRadius: "28px 28px 0 0",
          padding: "22px 20px calc(26px + env(safe-area-inset-bottom))",
          animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 5,
            borderRadius: 999,
            background: "var(--line2)",
            margin: "0 auto 18px",
          }}
        />
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em" }}>
          Open a temporary room
        </div>
        <p style={{ fontSize: 13.5, margin: "6px 0 16px", color: "var(--muted)" }}>
          It goes live for everyone instantly and closes itself when the timer
          ends.
        </p>

        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--faint)",
            marginBottom: 8,
          }}
        >
          ROOM NAME
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Late Night Chat"
          autoFocus
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid var(--line2)",
            background: "var(--bg)",
            borderRadius: 14,
            padding: "15px 16px",
            outline: "none",
            fontFamily: "var(--font-inter)",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--ink)",
          }}
        />

        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--faint)",
            margin: "18px 0 8px",
          }}
        >
          DURATION
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          {DURATIONS.map((d) => {
            const active = d.seconds === seconds;
            return (
              <button
                key={d.label}
                onClick={() => setSeconds(d.seconds)}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: "13px 6px",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 800,
                  fontSize: 13.5,
                  border: `1px solid ${active ? "transparent" : "var(--line2)"}`,
                  background: active ? "var(--violet)" : "var(--card)",
                  color: active ? "#fff" : "var(--ink)",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "18px 0 0",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".08em",
              color: "var(--faint)",
            }}
          >
            MEMBER LIMIT
          </div>
          <button
            onClick={() => setLimited((v) => !v)}
            role="switch"
            aria-checked={limited}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontFamily: "var(--font-inter)",
              fontWeight: 700,
              fontSize: 12.5,
              color: limited ? "var(--violet)" : "var(--muted)",
            }}
          >
            {limited ? "Limited" : "Unlimited"}
            <span
              style={{
                width: 38,
                height: 22,
                borderRadius: 999,
                background: limited ? "var(--violet)" : "var(--line2)",
                position: "relative",
                transition: "background .15s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: limited ? 18 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left .15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                }}
              />
            </span>
          </button>
        </div>
        {limited && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            <input
              type="number"
              min={2}
              max={5000}
              value={capacity}
              onChange={(e) =>
                setCapacity(Math.max(2, Math.min(5000, Number(e.target.value) || 2)))
              }
              style={{
                width: 110,
                boxSizing: "border-box",
                border: "1px solid var(--line2)",
                background: "var(--bg)",
                borderRadius: 12,
                padding: "12px 14px",
                outline: "none",
                fontFamily: "var(--font-inter)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--ink)",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              people can join
            </span>
          </div>
        )}

        <button
          onClick={() =>
            onCreate(name.trim() || "New Room", seconds, limited ? capacity : null)
          }
          disabled={busy}
          style={{
            width: "100%",
            border: "none",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
            background: "var(--violet)",
            color: "#fff",
            borderRadius: 14,
            padding: 16,
            marginTop: 20,
            fontWeight: 800,
            fontSize: 16,
            boxShadow: "0 12px 28px -8px rgba(124,58,237,.5)",
          }}
        >
          {busy ? "Creating…" : "Create & go live"}
        </button>
      </div>
    </div>
  );
}
