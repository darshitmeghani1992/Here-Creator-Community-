import Link from "next/link";

/**
 * Minimal landing. The real product entry point is a creator space link
 * (e.g. /ananya); this page just points there for local exploration.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: 24,
        textAlign: "center",
        background:
          "radial-gradient(900px 600px at 82% -10%,rgba(124,58,237,.12),transparent 60%),var(--bg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "var(--violet)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 22px rgba(124,58,237,.4)",
          }}
        >
          <div
            style={{ width: 15, height: 15, borderRadius: 5, background: "#fff" }}
          />
        </div>
        <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-.02em" }}>
          HERE
        </div>
      </div>
      <h1
        style={{
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1.04,
          margin: 0,
          letterSpacing: "-.03em",
          maxWidth: 420,
        }}
      >
        One link. A live space.
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 360, margin: 0 }}>
        Click a creator&apos;s link, land in their space, and join an open room
        to chat in real time.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 300,
        }}
      >
        <Link
          href="/studio"
          style={{
            background: "var(--violet)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            padding: "14px 26px",
            borderRadius: 999,
            textDecoration: "none",
            textAlign: "center",
            boxShadow: "0 12px 28px -8px rgba(124,58,237,.5)",
          }}
        >
          Create your space
        </Link>
        <Link
          href="/ananya"
          style={{
            background: "var(--card)",
            color: "var(--ink)",
            fontWeight: 700,
            fontSize: 15,
            padding: "13px 26px",
            borderRadius: 999,
            textDecoration: "none",
            textAlign: "center",
            border: "1px solid var(--line2)",
          }}
        >
          Explore a live space →
        </Link>
      </div>
    </main>
  );
}
