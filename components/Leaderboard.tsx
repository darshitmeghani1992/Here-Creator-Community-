"use client";

import { useState } from "react";
import type { LeaderRow } from "@/lib/types";
import { levelFromPoints } from "@/lib/fan";

/**
 * Overall + weekly fan leaderboards. Rows are SSR'd and passed in; the current
 * user's row (if present) is highlighted.
 */
export function Leaderboard({
  overall,
  weekly,
  currentUserId,
}: {
  overall: LeaderRow[];
  weekly: LeaderRow[];
  currentUserId: string | null;
}) {
  const [tab, setTab] = useState<"overall" | "weekly">("overall");
  const rows = tab === "overall" ? overall : weekly;

  return (
    <div
      style={{
        border: "1px solid var(--line2)",
        background: "var(--card)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🏆 Leaderboard</div>
        <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: 10, padding: 3 }}>
          {(["overall", "weekly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 800,
                fontSize: 12,
                textTransform: "capitalize",
                background: tab === t ? "var(--violet)" : "transparent",
                color: tab === t ? "var(--on-accent)" : "var(--muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--muted)", fontSize: 13 }}>
          No fans on the board yet — be the first to play and earn points.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((r, i) => {
            const me = r.user_id === currentUserId;
            return (
              <div
                key={r.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 8px",
                  borderRadius: 10,
                  background: me ? "var(--violet-100)" : "transparent",
                }}
              >
                <span
                  style={{
                    width: 22,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    color: i < 3 ? "var(--violet)" : "var(--muted)",
                    flex: "none",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    flex: "none",
                    background: r.avatar_url
                      ? `center/cover no-repeat url(${r.avatar_url})`
                      : "var(--violet)",
                    color: "var(--on-accent)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {!r.avatar_url && r.display_name.slice(0, 1).toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.display_name}
                  {me && <span style={{ color: "var(--violet)", fontSize: 11, marginLeft: 6 }}>you</span>}
                </span>
                <span style={{ flex: "none", fontWeight: 800, fontSize: 13 }}>
                  {r.points}
                  <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 11 }}> pts</span>
                </span>
                {tab === "overall" && r.level != null && (
                  <span style={{ flex: "none", fontSize: 10.5, color: "var(--muted)", fontWeight: 700, width: 58, textAlign: "right" }}>
                    {levelFromPoints(r.points).name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
