"use client";

import { useState } from "react";

const MAX_OPTIONS = 4;

/** Creator-only bottom sheet to start a poll: a question + 2–4 options. */
export function CreatePollSheet({
  onCreate,
  onClose,
  busy,
}: {
  onCreate: (question: string, options: string[]) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  const valid =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

  function submit() {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) return;
    onCreate(question.trim(), clean);
  }

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
        zIndex: 25,
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
          Start a poll
        </div>
        <p style={{ fontSize: 13.5, margin: "6px 0 16px", color: "var(--muted)" }}>
          Ask the room a question — everyone can vote live.
        </p>

        <div style={labelStyle}>QUESTION</div>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What should we do next?"
          autoFocus
          style={{ ...inputStyle, fontWeight: 700 }}
        />

        <div style={{ ...labelStyle, marginTop: 18 }}>OPTIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                style={inputStyle}
              />
              {options.length > 2 && (
                <button
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove option"
                  style={{
                    flex: "none",
                    width: 40,
                    height: 44,
                    border: "1px solid var(--line2)",
                    background: "var(--card)",
                    borderRadius: 12,
                    cursor: "pointer",
                    color: "var(--muted)",
                    fontSize: 18,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < MAX_OPTIONS && (
          <button
            onClick={() => setOptions((prev) => [...prev, ""])}
            style={{
              marginTop: 10,
              border: "1px dashed var(--violet-200)",
              background: "var(--violet-100)",
              color: "var(--violet-dk)",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 800,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            ＋ Add option
          </button>
        )}

        <button
          onClick={submit}
          disabled={busy || !valid}
          style={{
            width: "100%",
            border: "none",
            cursor: busy || !valid ? "default" : "pointer",
            opacity: busy || !valid ? 0.6 : 1,
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
          {busy ? "Starting…" : "Launch poll"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".08em",
  color: "var(--faint)",
  marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line2)",
  background: "var(--bg)",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
  fontFamily: "var(--font-inter)",
  fontSize: 15,
  color: "var(--ink)",
};
