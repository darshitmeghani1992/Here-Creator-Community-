import { AppShell } from "@/components/AppShell";

/**
 * Shown instead of a stack trace when Supabase env is missing — e.g. right
 * after cloning, before `.env.local` is filled in.
 */
export function SetupNotice() {
  return (
    <AppShell>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 14,
          padding: 32,
        }}
      >
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
          <div style={{ width: 15, height: 15, borderRadius: 5, background: "#fff" }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Almost there</div>
        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 300, margin: 0 }}>
          Supabase isn&apos;t configured yet. Copy{" "}
          <code
            style={{
              background: "var(--violet-100)",
              color: "var(--violet-dk)",
              padding: "1px 6px",
              borderRadius: 6,
              fontSize: 12.5,
            }}
          >
            .env.example
          </code>{" "}
          to{" "}
          <code
            style={{
              background: "var(--violet-100)",
              color: "var(--violet-dk)",
              padding: "1px 6px",
              borderRadius: 6,
              fontSize: 12.5,
            }}
          >
            .env.local
          </code>
          , add your project URL and anon key, then run the SQL migration. See the
          README for the 5-minute setup.
        </p>
      </div>
    </AppShell>
  );
}
