"use client";

/** Dark pill toast with a violet check, matching the prototype. Render only when shown. */
export function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 100,
        background: "var(--ink)",
        color: "#fff",
        padding: "14px 16px",
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        gap: 11,
        animation: "toastIn .28s cubic-bezier(.2,.8,.2,1)",
        zIndex: 30,
        boxShadow: "0 16px 40px rgba(0,0,0,.25)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--violet)",
          display: "grid",
          placeItems: "center",
          flex: "none",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{message}</span>
    </div>
  );
}
