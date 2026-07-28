import { ICON_PATHS, FILLED_ICONS, type IconName } from "@/lib/rooms";

/** Renders a room glyph in the prototype's 24×24 stroke style. */
export function RoomIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const filled = FILLED_ICONS.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
