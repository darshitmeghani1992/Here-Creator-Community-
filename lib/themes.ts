import type { CSSProperties } from "react";

/**
 * A theme is a small set of base color tokens. The rest of the palette (tints,
 * borders, faint text) is derived from these via color-mix() in globals.css,
 * so overriding just these on a wrapper re-skins the whole app.
 *
 * Palettes are a mix of HERE originals and daisyUI-derived schemes.
 */
export interface Theme {
  id: string;
  name: string;
  group: "Signature" | "Vibrant" | "Dark" | "Abstract" | "daisyUI";
  dark?: boolean;
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
}

export const THEMES: Theme[] = [
  // ── Signature ──
  { id: "lumina", name: "Lumina", group: "Signature", bg: "#f4f5f8", card: "#ffffff", ink: "#15171c", muted: "#697386", line: "#e9ebf1", accent: "#7c3aed", onAccent: "#ffffff" },
  { id: "mono", name: "Monochrome", group: "Signature", bg: "#ffffff", card: "#ffffff", ink: "#0a0a0a", muted: "#6d6d6d", line: "#e6e6e6", accent: "#0a0a0a", onAccent: "#ffffff" },

  // ── Vibrant ──
  { id: "acid", name: "Acid", group: "Vibrant", bg: "#e7ff5a", card: "#ffffff", ink: "#111400", muted: "#5c603f", line: "#d4e86a", accent: "#111400", onAccent: "#dcff4a" },
  { id: "cobalt", name: "Cobalt", group: "Vibrant", bg: "#eef0ff", card: "#ffffff", ink: "#0f1230", muted: "#5b6191", line: "#e0e3fb", accent: "#2f27ff", onAccent: "#ffffff" },
  { id: "ultraviolet", name: "Ultraviolet", group: "Vibrant", bg: "#f4e8ff", card: "#ffffff", ink: "#2a0d4e", muted: "#7a5a9c", line: "#e7d6fb", accent: "#8b2fff", onAccent: "#ffffff" },
  { id: "tangerine", name: "Tangerine", group: "Vibrant", bg: "#fff1e6", card: "#ffffff", ink: "#3a1c0a", muted: "#9c6b4a", line: "#f6dcc6", accent: "#ff6a1a", onAccent: "#ffffff" },
  { id: "bubblegum", name: "Bubblegum", group: "Vibrant", bg: "#ffe6f4", card: "#ffffff", ink: "#6a2a52", muted: "#b06e93", line: "#f6d4e7", accent: "#ff5fb0", onAccent: "#ffffff" },

  // ── Dark ──
  { id: "midnight", name: "Midnight", group: "Dark", dark: true, bg: "#0d0f16", card: "#161a24", ink: "#eef0f6", muted: "#9aa2b1", line: "#252b38", accent: "#a78bfa", onAccent: "#171226" },
  { id: "neon", name: "Neon Arcade", group: "Dark", dark: true, bg: "#07070e", card: "#0f1020", ink: "#e7f6ff", muted: "#8390b5", line: "#1c2036", accent: "#00e5ff", onAccent: "#001820" },

  // ── Abstract ──
  { id: "aurora", name: "Aurora", group: "Abstract", dark: true, bg: "#0b1022", card: "#141b30", ink: "#eaf0ff", muted: "#95a2c6", line: "#232c47", accent: "#38bdf8", onAccent: "#04121f" },
  { id: "holographic", name: "Holographic", group: "Abstract", bg: "#f3e9ff", card: "#ffffff", ink: "#39304c", muted: "#7d7291", line: "#ece2f6", accent: "#a45cff", onAccent: "#ffffff" },

  // ── daisyUI-derived ──
  { id: "light", name: "Light", group: "daisyUI", bg: "#f2f3f5", card: "#ffffff", ink: "#1f2937", muted: "#6b7280", line: "#e5e7eb", accent: "#570df8", onAccent: "#ffffff" },
  { id: "dark", name: "Dark", group: "daisyUI", dark: true, bg: "#191e24", card: "#1d232a", ink: "#c9ced6", muted: "#8b93a1", line: "#2a313b", accent: "#7c5cff", onAccent: "#ffffff" },
  { id: "cupcake", name: "Cupcake", group: "daisyUI", bg: "#efeae6", card: "#faf7f5", ink: "#291334", muted: "#8a7d92", line: "#e3dbd6", accent: "#3aa6a6", onAccent: "#ffffff" },
  { id: "synthwave", name: "Synthwave", group: "daisyUI", dark: true, bg: "#1a103f", card: "#2d1b69", ink: "#f9f7fd", muted: "#b3a7d9", line: "#3b2a7a", accent: "#e779c1", onAccent: "#1a103f" },
  { id: "retro", name: "Retro", group: "daisyUI", bg: "#e4d8b4", card: "#ede6cc", ink: "#282425", muted: "#7c7259", line: "#d3c69f", accent: "#d15b52", onAccent: "#ffffff" },
  { id: "cyberpunk", name: "Cyberpunk", group: "daisyUI", bg: "#fff350", card: "#fffa8a", ink: "#0d0d00", muted: "#6a6516", line: "#e8dd3a", accent: "#ff2e88", onAccent: "#ffffff" },
  { id: "valentine", name: "Valentine", group: "daisyUI", bg: "#f5d9e8", card: "#fdeaf3", ink: "#632c3b", muted: "#a9788a", line: "#f2cade", accent: "#e96d7b", onAccent: "#ffffff" },
  { id: "dracula", name: "Dracula", group: "daisyUI", dark: true, bg: "#21222c", card: "#282a36", ink: "#f8f8f2", muted: "#a7aabf", line: "#343746", accent: "#bd93f9", onAccent: "#21222c" },
  { id: "aqua", name: "Aqua", group: "daisyUI", dark: true, bg: "#2a5c9c", card: "#345da7", ink: "#e9fbff", muted: "#b7cbe6", line: "#3f6cb5", accent: "#09ecf3", onAccent: "#05263b" },
  { id: "forest", name: "Forest", group: "daisyUI", dark: true, bg: "#121917", card: "#1b2420", ink: "#dbe5df", muted: "#8fa398", line: "#26332d", accent: "#1eb854", onAccent: "#04130a" },
  { id: "coffee", name: "Coffee", group: "daisyUI", dark: true, bg: "#1a1015", card: "#20161f", ink: "#d6c4a8", muted: "#9c8a76", line: "#2e222b", accent: "#db924b", onAccent: "#1a1015" },
  { id: "luxury", name: "Luxury", group: "daisyUI", dark: true, bg: "#09090b", card: "#141417", ink: "#eae0cf", muted: "#9a927f", line: "#232327", accent: "#d4af37", onAccent: "#0a0a0c" },
  { id: "lemonade", name: "Lemonade", group: "daisyUI", bg: "#f5fbe8", card: "#ffffff", ink: "#1a2e05", muted: "#6b7a54", line: "#e6efce", accent: "#519903", onAccent: "#ffffff" },
  { id: "pastel", name: "Pastel", group: "daisyUI", bg: "#f6f4f7", card: "#ffffff", ink: "#37354a", muted: "#807b93", line: "#ebe7ef", accent: "#b78fd4", onAccent: "#ffffff" },
];

export const DEFAULT_THEME = "lumina";

export function themeById(id?: string | null): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * The CSS custom properties to set on a wrapper element so everything inside
 * (which reads var(--bg), var(--violet), etc.) adopts the theme. The derived
 * tokens in globals.css reference these, so they recompute automatically.
 */
export function themeVars(id?: string | null): CSSProperties {
  const t = themeById(id);
  return {
    "--bg": t.bg,
    "--card": t.card,
    "--ink": t.ink,
    "--muted": t.muted,
    "--line": t.line,
    "--violet": t.accent,
    "--on-accent": t.onAccent,
  } as CSSProperties;
}
