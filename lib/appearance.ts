import type { CSSProperties } from "react";
import type { Appearance } from "@/lib/types";
import { themeById } from "@/lib/themes";

/**
 * Linktree-style personalization, cross-engineered onto HERE's token system.
 *
 * A theme still sets the base palette (via themeVars). On top of that, a
 * creator's `appearance` blob overrides three things independently:
 *   • the page background (flat / gradient / image)
 *   • the link-button styling (shape / fill / colour / shadow)
 *   • the font family
 *
 * When a field is missing we fall back to sensible defaults derived from the
 * chosen theme, so a brand-new space already looks coherent.
 */

export interface Font {
  key: string;
  name: string;
  /** The CSS var wired up in app/layout.tsx via next/font. */
  cssVar: string;
  /** Fallback stack if the webfont hasn't loaded. */
  fallback: string;
}

export const FONTS: Font[] = [
  { key: "inter", name: "Inter", cssVar: "--font-inter", fallback: "sans-serif" },
  { key: "poppins", name: "Poppins", cssVar: "--font-poppins", fallback: "sans-serif" },
  { key: "grotesk", name: "Space Grotesk", cssVar: "--font-grotesk", fallback: "sans-serif" },
  { key: "dmsans", name: "DM Sans", cssVar: "--font-dmsans", fallback: "sans-serif" },
  { key: "fraunces", name: "Fraunces", cssVar: "--font-fraunces", fallback: "Georgia, serif" },
];

export function fontByKey(key?: string | null): Font {
  return FONTS.find((f) => f.key === key) ?? FONTS[0];
}

export function fontFamilyCss(key?: string | null): string {
  const f = fontByKey(key);
  return `var(${f.cssVar}), ${f.fallback}`;
}

/** A fully-populated appearance (no optional holes) ready to render from. */
export type ResolvedAppearance = Required<{
  background: Required<Appearance["background"]>;
  button: Appearance["button"];
  font: string;
}>;

/**
 * Merge a creator's stored appearance with theme-derived defaults so callers
 * always get a complete object. Pure — safe on both server and client.
 */
export function resolveAppearance(
  themeId?: string | null,
  appearance?: Appearance | null,
): ResolvedAppearance {
  const t = themeById(themeId);
  const bg = appearance?.background;
  const btn = appearance?.button;
  return {
    background: {
      type: bg?.type ?? "flat",
      color: bg?.color ?? t.bg,
      color2: bg?.color2 ?? t.card,
      angle: bg?.angle ?? 160,
      imageUrl: bg?.imageUrl ?? "",
    },
    button: {
      shape: btn?.shape ?? "rounded",
      fill: btn?.fill ?? "solid",
      color: btn?.color ?? t.accent,
      textColor: btn?.textColor ?? t.onAccent,
      shadow: btn?.shadow ?? true,
    },
    font: appearance?.font ?? "inter",
  };
}

/** The CSS `background` value for the page/column, from a resolved appearance. */
export function pageBackgroundCss(a: ResolvedAppearance): string {
  const b = a.background;
  if (b.type === "gradient") {
    return `linear-gradient(${b.angle}deg, ${b.color}, ${b.color2})`;
  }
  if (b.type === "image" && b.imageUrl) {
    // Scrim over the image keeps card/text contrast reasonable.
    return `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.28)), center/cover no-repeat url(${b.imageUrl}), ${b.color}`;
  }
  return b.color;
}

const SHAPE_RADIUS: Record<string, number> = { rounded: 14, pill: 999, sharp: 4 };

/**
 * The base CSSProperties for a link button, from a resolved appearance.
 * Components spread this and add their own layout (icon, gap, padding).
 */
export function buttonStyle(a: ResolvedAppearance): CSSProperties {
  const { shape, fill, color, textColor, shadow } = a.button;
  const radius = SHAPE_RADIUS[shape] ?? 14;

  const base: CSSProperties = {
    borderRadius: radius,
    fontWeight: 700,
    transition: "transform .12s ease",
  };

  let skin: CSSProperties;
  switch (fill) {
    case "outline":
      skin = {
        background: "transparent",
        color: `color-mix(in srgb, ${color} 72%, var(--ink))`,
        border: `1.6px solid ${color}`,
      };
      break;
    case "soft":
      skin = {
        background: `color-mix(in srgb, ${color} 16%, var(--card))`,
        color: `color-mix(in srgb, ${color} 74%, var(--ink))`,
        border: "none",
      };
      break;
    case "glass":
      skin = {
        background: "rgba(255,255,255,.14)",
        color: "var(--ink)",
        border: "1px solid rgba(255,255,255,.28)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      };
      break;
    case "solid":
    default:
      skin = { background: color, color: textColor, border: "none" };
  }

  const withShadow: CSSProperties = shadow
    ? {
        boxShadow:
          fill === "solid"
            ? `0 10px 24px -10px color-mix(in srgb, ${color} 60%, transparent)`
            : "0 8px 20px -12px rgba(15,17,30,.35)",
      }
    : {};

  return { ...base, ...skin, ...withShadow };
}

/** Default appearance (used when a creator has never customised). */
export function defaultAppearance(themeId?: string | null): Appearance {
  const r = resolveAppearance(themeId, null);
  return {
    background: { ...r.background },
    button: { ...r.button },
    font: r.font,
  };
}
