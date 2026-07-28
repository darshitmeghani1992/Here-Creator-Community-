/**
 * Space handle rules. A handle becomes part of the URL (`/[handle]`), so it
 * must be URL-safe, lowercase, and must not collide with real app routes.
 */

// Reserved because they're real top-level routes or would be confusing.
const RESERVED = new Set([
  "studio",
  "auth",
  "api",
  "room",
  "rooms",
  "admin",
  "login",
  "logout",
  "signup",
  "signin",
  "settings",
  "about",
  "help",
  "support",
  "terms",
  "privacy",
  "_next",
  "favicon",
  "manifest",
  "icons",
  "public",
  "static",
  "new",
  "create",
  "me",
]);

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/** Lowercases and strips anything that isn't a-z, 0-9, hyphen or underscore. */
export function normalizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, HANDLE_MAX);
}

/** Returns an error message if the handle is invalid, or null if it's OK. */
export function validateHandle(handle: string): string | null {
  if (handle.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `At most ${HANDLE_MAX} characters.`;
  if (!/^[a-z0-9_-]+$/.test(handle))
    return "Only letters, numbers, hyphens and underscores.";
  if (!/^[a-z0-9]/.test(handle)) return "Must start with a letter or number.";
  if (RESERVED.has(handle)) return "That name is reserved — pick another.";
  return null;
}
