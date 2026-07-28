"use client";

import { useRef, useState } from "react";
import type { PollOptionInput } from "@/lib/types";

const MAX_OPTIONS = 4;

/**
 * Creator-only bottom sheet to start a poll: a question + 2–4 options, each of
 * which can optionally carry an image. `uploadImage` uploads a picked file and
 * resolves to a public URL.
 */
export function CreatePollSheet({
  onCreate,
  onClose,
  uploadImage,
  busy,
  title = "Start a poll",
}: {
  onCreate: (question: string, options: PollOptionInput[]) => void;
  onClose: () => void;
  uploadImage: (file: File) => Promise<string>;
  busy?: boolean;
  title?: string;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOptionInput[]>([
    { label: "", image: null },
    { label: "", image: null },
  ]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetIdx = useRef<number>(0);

  function patch(i: number, next: Partial<PollOptionInput>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...next } : o)));
  }

  function pickImage(i: number) {
    targetIdx.current = i;
    fileInputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const i = targetIdx.current;
    setUploadingIdx(i);
    try {
      const url = await uploadImage(file);
      patch(i, { image: url });
    } catch {
      /* ignore upload failure */
    } finally {
      setUploadingIdx(null);
    }
  }

  const valid =
    question.trim().length > 0 &&
    options.filter((o) => o.label.trim().length > 0 || o.image).length >= 2;

  function submit() {
    const clean = options.filter((o) => o.label.trim().length > 0 || o.image);
    if (!question.trim() || clean.length < 2) return;
    onCreate(
      question.trim(),
      clean.map((o) => ({ label: o.label.trim(), image: o.image })),
    );
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: "none" }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "88%",
          overflowY: "auto",
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
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em" }}>{title}</div>
        <p style={{ fontSize: 13.5, margin: "6px 0 16px", color: "var(--muted)" }}>
          Ask a question — everyone can vote live. Add images to options if you like.
        </p>

        <div style={labelStyle}>QUESTION</div>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Which one should we do?"
          autoFocus
          style={{ ...inputStyle, fontWeight: 700 }}
        />

        <div style={{ ...labelStyle, marginTop: 18 }}>OPTIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => pickImage(i)}
                aria-label="Add an image to this option"
                style={{
                  flex: "none",
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  border: "1px solid var(--line2)",
                  background: opt.image ? `center/cover no-repeat url(${opt.image})` : "var(--bg)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: "var(--muted)",
                  overflow: "hidden",
                }}
              >
                {uploadingIdx === i ? (
                  <span style={{ fontSize: 10, fontWeight: 700 }}>…</span>
                ) : opt.image ? null : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8.5" cy="9" r="1.6" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
              </button>
              <input
                value={opt.label}
                onChange={(e) => patch(i, { label: e.target.value })}
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
                    height: 46,
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
            onClick={() => setOptions((prev) => [...prev, { label: "", image: null }])}
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
