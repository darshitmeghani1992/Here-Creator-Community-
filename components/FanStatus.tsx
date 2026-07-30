"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/useUser";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth-client";
import { levelFromPoints, nextLevel, levelProgress } from "@/lib/fan";
import { badgeDef } from "@/lib/badges";
import type { FanStatus as Status } from "@/lib/points";

/**
 * The signed-in fan's progression card (level, points, streak, rank, badges),
 * or a "sign in to earn" prompt for guests. Runs the daily check-in on mount.
 */
export function FanStatus({
  creatorId,
  handle,
}: {
  creatorId: string;
  handle: string;
}) {
  const { user, loading } = useUser();
  const [state, setState] = useState<
    { signedIn: true; status: Status } | { signedIn: false } | null
  >(null);
  const requested = useRef<string | null>(null);

  const checkin = useCallback(async () => {
    try {
      const res = await fetch("/api/fan/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      const data = await res.json();
      if (data.signedIn) {
        setState({ signedIn: true, status: data as Status });
      } else {
        setState({ signedIn: false });
      }
    } catch {
      setState({ signedIn: false });
    }
  }, [creatorId]);

  useEffect(() => {
    if (loading) return;
    // Re-run when auth identity changes (e.g. after magic-link sign-in).
    const key = user?.id ?? "anon";
    if (requested.current === key) return;
    requested.current = key;
    checkin();
  }, [loading, user, checkin]);

  if (state === null) {
    return <Shell><div style={{ height: 74 }} /></Shell>;
  }

  if (!state.signedIn) {
    return <SignInPrompt handle={handle} />;
  }

  const s = state.status;
  const lvl = levelFromPoints(s.points);
  const nxt = nextLevel(s.points);
  const pct = levelProgress(s.points);
  const earnedBadges = s.badges.map(badgeDef).filter(Boolean);

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            flex: "none",
            background: "var(--violet)",
            color: "var(--on-accent)",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {lvl.level}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {lvl.name}
            {s.earned > 0 && (
              <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 12, marginLeft: 8 }}>
                +{s.earned} today
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            {s.points} pts · 🔥 {s.streak_days}-day streak · #{s.rank}
          </div>
        </div>
      </div>

      {/* Level progress */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 8, borderRadius: 999, background: "var(--violet-100)", overflow: "hidden" }}>
          <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: "var(--violet)", borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, fontWeight: 600 }}>
          {nxt ? `${nxt.min - s.points} pts to ${nxt.name}` : "Max level — you're an OG 👑"}
        </div>
      </div>

      {earnedBadges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {earnedBadges.map((b) => (
            <span
              key={b!.key}
              title={b!.desc}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                background: "var(--violet-100)",
                color: "var(--violet-dk)",
                borderRadius: 999,
                padding: "5px 10px",
              }}
            >
              {b!.emoji} {b!.name}
            </span>
          ))}
        </div>
      )}
    </Shell>
  );
}

function SignInPrompt({ handle }: { handle: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) return;
    setBusy(true);
    try {
      await signInWithEmail(value, `/${handle}`);
      setSent(true);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div style={{ fontWeight: 800, fontSize: 15 }}>Join the fan club 🏆</div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 12px", fontWeight: 600 }}>
        Sign in to earn points, keep a streak, collect badges, and climb the leaderboard.
      </p>
      {sent ? (
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
          📬 Check your email for the sign-in link.
        </div>
      ) : (
        <>
          <button
            onClick={() => signInWithGoogle(`/${handle}`)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              border: "1px solid var(--line2)",
              background: "var(--card)",
              color: "var(--ink)",
              borderRadius: 12,
              padding: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1H12v3.8h5.35c-.25 1.3-1 2.4-2.15 3.15v2.6h3.5c2.05-1.9 3.2-4.7 3.2-8 0-.6-.05-1.15-.15-1.75z" />
              <path d="M12 22c2.7 0 4.95-.9 6.6-2.35l-3.5-2.6c-.9.6-2.05.95-3.1.95-2.4 0-4.4-1.6-5.15-3.8H3.25v2.65C4.9 19.75 8.2 22 12 22z" opacity=".6" />
            </svg>
            Continue with Google
          </button>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="you@email.com"
              type="email"
              style={{
                flex: 1,
                minWidth: 0,
                border: "1px solid var(--line2)",
                background: "var(--bg)",
                borderRadius: 12,
                padding: "11px 13px",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={send}
              disabled={busy}
              style={{
                flex: "none",
                border: "none",
                cursor: "pointer",
                background: "var(--violet)",
                color: "var(--on-accent)",
                borderRadius: 12,
                padding: "11px 16px",
                fontWeight: 800,
                fontSize: 14,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--line2)",
        background: "var(--card)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
