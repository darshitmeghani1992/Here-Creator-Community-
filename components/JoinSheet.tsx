"use client";

import { useState } from "react";

/**
 * Bottom sheet shown when a user taps a room they haven't joined.
 * Google or one-tap guest name → Enter. Matches the prototype's join overlay.
 */
export function JoinSheet({
  roomName,
  initialGuestName,
  onGoogle,
  onGuest,
  onClose,
}: {
  roomName: string;
  initialGuestName: string;
  onGoogle: () => void;
  onGuest: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialGuestName);

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
          Join {roomName}
        </div>
        <p style={{ fontSize: 13.5, margin: "6px 0 18px", color: "var(--muted)" }}>
          Pick how you want to appear in the room.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={onGoogle}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 44,
              border: "1px solid var(--line2)",
              background: "var(--card)",
              color: "var(--ink)",
              borderRadius: 14,
              padding: "14px 16px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1H12v3.8h5.35c-.25 1.3-1 2.4-2.15 3.15v2.6h3.5c2.05-1.9 3.2-4.7 3.2-8 0-.6-.05-1.15-.15-1.75z" />
              <path
                d="M12 22c2.7 0 4.95-.9 6.6-2.35l-3.5-2.6c-.9.6-2.05.95-3.1.95-2.4 0-4.4-1.6-5.15-3.8H3.25v2.65C4.9 19.75 8.2 22 12 22z"
                opacity=".6"
              />
            </svg>
            Continue with Google
          </button>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onGuest(name.trim());
              }}
              placeholder="…or type a guest name"
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                border: "1px solid var(--line2)",
                background: "var(--bg)",
                borderRadius: 14,
                padding: "14px 16px",
                outline: "none",
                fontFamily: "var(--font-inter)",
                fontSize: 15,
                color: "var(--ink)",
              }}
            />
            <button
              onClick={() => onGuest(name.trim())}
              style={{
                flex: "none",
                border: "none",
                cursor: "pointer",
                background: "var(--violet)",
                color: "#fff",
                borderRadius: 14,
                padding: "14px 20px",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              Enter
            </button>
          </div>
        </div>
        <p
          style={{
            fontSize: 11,
            textAlign: "center",
            marginTop: 14,
            color: "var(--faint)",
          }}
        >
          No account needed — guests join in one tap.
        </p>
      </div>
    </div>
  );
}
