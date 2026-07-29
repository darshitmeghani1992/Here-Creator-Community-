import { themeVars } from "@/lib/themes";
import {
  resolveAppearance,
  pageBackgroundCss,
  fontFamilyCss,
} from "@/lib/appearance";
import type { Appearance } from "@/lib/types";

/**
 * Mobile-first frame. Full-bleed on phones; on larger screens it centers a
 * phone-width column over a subtle accent radial wash.
 *
 * `theme` sets the base palette (its tokens flow to every child via var(--…)).
 * `appearance` layers Linktree-style personalization on top: the column's
 * background (flat / gradient / image) and the font family.
 */
export function AppShell({
  children,
  theme,
  appearance,
}: {
  children: React.ReactNode;
  theme?: string | null;
  appearance?: Appearance | null;
}) {
  const ap = resolveAppearance(theme, appearance);
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
          background: pageBackgroundCss(ap),
          color: "var(--ink)",
          fontFamily: fontFamilyCss(ap.font),
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
