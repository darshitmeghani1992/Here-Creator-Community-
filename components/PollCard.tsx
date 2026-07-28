"use client";

import type { Poll, PollVoteRow } from "@/lib/types";

/**
 * Live poll, pinned under the room header. Shows each option as a bar that
 * fills with its share of the vote; tapping an option casts or changes your
 * vote. Tallies update in real time as votes arrive.
 */
export function PollCard({
  poll,
  votes,
  myVote,
  isOwner,
  onVote,
  onClose,
}: {
  poll: Poll;
  votes: PollVoteRow[];
  myVote: number | null;
  isOwner: boolean;
  onVote: (optionIndex: number) => void;
  onClose: () => void;
}) {
  const total = votes.length;
  const counts = poll.options.map(
    (_, i) => votes.filter((v) => v.option_index === i).length,
  );

  return (
    <div
      style={{
        flex: "none",
        margin: "0 15px",
        marginTop: 12,
        background: "var(--card)",
        border: "1px solid var(--violet-200)",
        borderRadius: 16,
        padding: "13px 14px",
        boxShadow: "0 6px 18px -8px rgba(124,58,237,.28)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--violet)",
            background: "var(--violet-100)",
            padding: "3px 7px",
            borderRadius: 5,
          }}
        >
          LIVE POLL
        </span>
        <div style={{ flex: 1 }} />
        {isOwner && (
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              color: "var(--muted)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            End poll
          </button>
        )}
      </div>

      <div style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.25 }}>
        {poll.question}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 11 }}>
        {poll.options.map((opt, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          const mine = myVote === i;
          const img = poll.option_images?.[i];
          return (
            <button
              key={i}
              onClick={() => onVote(i)}
              style={{
                position: "relative",
                width: "100%",
                textAlign: "left",
                overflow: "hidden",
                cursor: "pointer",
                border: `1.5px solid ${mine ? "var(--violet)" : "var(--line2)"}`,
                background: "var(--card)",
                borderRadius: 12,
                padding: "11px 13px",
                fontFamily: "var(--font-inter)",
              }}
            >
              {/* proportional fill */}
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${pct}%`,
                  background: mine ? "var(--violet-200)" : "var(--violet-100)",
                  transition: "width .35s ease",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontWeight: mine ? 800 : 600,
                    fontSize: 14,
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  {mine && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="3" style={{ flex: "none" }}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={opt}
                      style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", flex: "none" }}
                    />
                  ) : null}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opt || (img ? "Image" : "")}
                  </span>
                </span>
                <span
                  style={{
                    flex: "none",
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: mine ? "var(--violet-dk)" : "var(--muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 9, fontWeight: 600 }}>
        {total} {total === 1 ? "vote" : "votes"}
        {myVote == null ? " · tap an option to vote" : " · tap to change your vote"}
      </div>
    </div>
  );
}
