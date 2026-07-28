/**
 * Mobile-first frame. Full-bleed on phones; on larger screens it centers a
 * phone-width column over the prototype's subtle violet radial wash.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(900px 600px at 82% -10%,rgba(124,58,237,.12),transparent 60%),var(--bg)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100dvh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 0 0 1px var(--line)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
