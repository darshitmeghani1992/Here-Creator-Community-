import { themeVars } from "@/lib/themes";

/**
 * Mobile-first frame. Full-bleed on phones; on larger screens it centers a
 * phone-width column over a subtle accent radial wash. Pass `theme` (a theme
 * id) to re-skin everything inside — the theme's tokens are set here and every
 * child reads them through var(--…).
 */
export function AppShell({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme?: string | null;
}) {
  return (
    <div
      style={{
        ...themeVars(theme),
        minHeight: "100dvh",
        background:
          "radial-gradient(900px 600px at 82% -10%, color-mix(in srgb, var(--violet) 12%, transparent), transparent 60%), var(--bg)",
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
          color: "var(--ink)",
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
