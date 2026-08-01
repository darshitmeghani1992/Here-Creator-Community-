# 14 · Changelog *(living)*

Version-per-feature log for the native app (`mobile/`). Newest first. Bump the
minor version per shipped slice; note schema/doc changes.

## Unreleased
- Documentation suite added under `docs/` (product spec, flows, acceptance
  criteria, edge cases, DB, architecture w/ games-as-plugins, AI rules, DoD,
  and living analytics/perf/security/release docs).

## 0.3 — My Wall hero
- 2-column masonry of tilted, pinned marks with hard shadows.
- Per-type renderers: sticky, roast, secret (tap-to-reveal), memory/photo
  (polaroid), award (gold badge), poll (bars), doodle, prediction (locked).
- Filter chips (All/Roasts/Photos/Awards).
- Live realtime drop-in of new marks; empty wall → invite-crew.

## 0.2 — Auth & onboarding
- Auth gate (welcome / setup / home) over the Supabase session.
- Onboarding: welcome → what-is-a-wall → interests → email-OTP/OAuth sign-in →
  profile setup (handle with live availability, name, bio, avatar upload).
- Auto Personal Wall on profile creation; profile tab + sign-out; invite-crew.

## 0.1 — Foundation & backend
- Expo/expo-router scaffold under `mobile/` (non-destructive to the web app).
- "The Wall" design system (tokens, type scale) + core primitives (MarkCard,
  Fastener, BottomDock, Screen, Text, Button, Input).
- Supabase RN client with session persistence.
- Migration `0010_walls.sql`: profiles/walls/marks/reactions/comments/
  poll_votes/friendships/notifications/reports + helper fns + triggers + RLS +
  realtime.
- Build hygiene: `mobile/` excluded from the web Vercel build (`.vercelignore`,
  root tsconfig).

---
### Template for new entries
```
## 0.x — <feature>
- <what changed, user-facing first>
- Schema: <migration/table changes, if any>
- Analytics: <events added>
```
