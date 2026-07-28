import type { Room } from "@/lib/types";

/** SVG path data for the four room glyphs used in the prototype. */
export const ICON_PATHS = {
  chat: "M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2zM18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1",
  video: "M23 7l-7 5 7 5zM1 5h15v14H1z",
  spark: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
  clock: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
} as const;

export type IconName = keyof typeof ICON_PATHS;

const CHIP_BG: Record<IconName, string> = {
  chat: "var(--violet)",
  video: "var(--red)",
  spark: "var(--green)",
  clock: "var(--orange)",
};

/** Filled vs stroked, matching the prototype (only `spark` is a filled glyph). */
export const FILLED_ICONS: Set<IconName> = new Set<IconName>(["spark"]);

const ICON_ORDER: IconName[] = ["chat", "video", "spark", "clock"];

/**
 * Deterministic icon + chip color for a room. Stable per room id so the chip
 * never flickers across renders, while giving the list the same colorful
 * variety as the prototype.
 */
export function roomVisual(room: Pick<Room, "id" | "kind">): {
  icon: IconName;
  chipBg: string;
} {
  let h = 0;
  for (let i = 0; i < room.id.length; i++) h = (h * 31 + room.id.charCodeAt(i)) | 0;
  const icon = ICON_ORDER[Math.abs(h) % ICON_ORDER.length];
  return { icon, chipBg: CHIP_BG[icon] };
}

/** Whole seconds remaining until a room closes; null for permanent rooms. */
export function remainingSeconds(closesAt: string | null, now = Date.now()): number | null {
  if (!closesAt) return null;
  return Math.max(0, Math.floor((new Date(closesAt).getTime() - now) / 1000));
}

/** "4h 12m" / "42m 7s" / "18s" — matches the prototype's _fmt. */
export function formatCountdown(secs: number | null): string {
  if (secs == null) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
