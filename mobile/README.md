# The Wall — native app (Expo)

Native **Expo / React Native** client for **The Wall** (Social Wall): a personal
wall where friends leave **Marks** (stickies, roasts, secrets, memories, photos,
awards, polls, doodles, predictions).

It shares the **same Supabase project** as the web app in the repo root — one
Postgres/Auth/Storage/Realtime backend, two frontends. The design system is a
faithful native re-creation of the `Warmanalog_prototype_screens` handoff.

## Stack
Expo (expo-router) · Supabase · Reanimated · Skia (doodle) · FlashList (masonry
wall) · expo-image-picker/camera · expo-notifications · PostHog · EAS builds.

## Setup
```bash
cd mobile
npm install
cp .env.example .env            # fill in the shared Supabase URL + anon key
npx expo start                  # press i / a for simulators, or scan in Expo Go
```

Run the DB migration once (Supabase SQL editor or `supabase db push`):
`../supabase/migrations/0010_walls.sql` — creates the Wall/Mark schema, RLS,
triggers (auto personal-wall, moderation status), and realtime.

In the shared Supabase project also: enable **Email** (OTP) and optionally
**Google/Apple** auth providers, add `thewall://auth/callback` as a redirect
URL, and ensure the public **`attachments`** storage bucket exists (the web app
already uses it) — avatars and mark photos upload there.

> **Fonts:** drop Bricolage Grotesque / Geist / Space Mono `.ttf` files into
> `assets/fonts/` and load them via `expo-font` in `app/_layout.tsx`. Until then
> the app falls back to system fonts.

## Layout
```
app/                     expo-router routes
  _layout.tsx            root stack (tabs + Create modal)
  index.tsx              entry → Home (Phase 1 adds auth branching)
  (tabs)/                Home · Walls · Discover · Profile (custom BottomDock)
  create.tsx             "Leave a Mark" type picker (modal)
src/
  theme/                 design tokens + type scale (source of truth)
  components/            Text, Screen, MarkCard, Fastener, BottomDock, Icon
  lib/                   supabase client, domain types
```

## Build roadmap (see /root plan for full timeline)
- **Phase 0 ✅** — scaffold, design system, core primitives, Supabase client,
  DB schema + RLS.
- **Phase 1 ✅** — auth gate + onboarding (welcome → what-is-a-wall → interests
  → email/OAuth sign-in → profile setup), auto Personal Wall, empty-wall
  "invite your crew", profile + sign-out.
- **Phase 2 ✅** — My Wall hero: 2-column masonry, per-type mark renderers
  (sticky, roast, secret tap-reveal, memory/photo polaroid, award, poll, doodle,
  prediction), filter chips, live realtime drop-in of new marks.
- **Phase 3** — Create flow + every writer (incl. Skia Doodle canvas).
- **Phase 4** — friends, Home feed, Discover, Friend Wall, Profile.
- **Phase 5** — reactions/comments, notifications+push, games, moderation, settings.
- **Phase 6** — polish, EAS builds, store submission.
