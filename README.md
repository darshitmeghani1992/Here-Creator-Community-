# HERE — MVP

**One link. A live space.** Click a creator's link → land in their space → see the
open rooms → join one and chat in real time. Creators can open a **temporary room**
that auto-closes on a timer.

Built with **Next.js (App Router) + Supabase** (Postgres, Auth, Realtime). Mobile-first,
installable as a PWA. The UI matches the interactive prototype pixel-for-pixel.

---

## What's here

| Screen | Route | Notes |
| --- | --- | --- |
| Space | `/[handle]` (e.g. `/ananya`) | SSR'd creator header + live room list with ticking countdowns |
| Room chat | `/[handle]/room/[roomId]` | SSR last 30 messages, realtime new messages, real presence count, reactions |
| OAuth callback | `/auth/callback` | Google / Apple code exchange |
| Auto-close cron | `/api/cron/close-rooms` | Sets `is_open=false` on expired temporary rooms |

Guest join is one tap (Supabase **anonymous** auth). Presence counts are **real**
(Supabase Realtime presence) — never faked. Expired temporary rooms truly close and
drop off the list; anyone inside is bounced to the Space with a notice.

---

## 5-minute setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com), create a project. From **Project Settings → API**,
copy into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, for the auto-close cron
CRON_SECRET=<any long random string>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run the database migration

Open **SQL Editor** in Supabase and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
It creates the four tables, enables Row Level Security with the right policies, turns on
Realtime for `rooms` + `messages`, and seeds creator **ananya** with three rooms
(The Lounge · New Video Chat · Morning Movement).

### 4. Enable auth providers

**Authentication → Providers**: enable **Anonymous** (required for one-tap guest join),
and optionally **Google** / **Apple**. For Google, add the redirect URL
`http://localhost:3000/auth/callback` (and your production URL later).

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000/ananya>.

---

## Become the creator (to test Step D)

The seeded creator `ananya` has no owner yet, so no one sees the creator controls.
To claim it:

1. Sign in once (any room's join sheet → guest name is fine) so you have a user id.
2. Find your id in Supabase **Authentication → Users**.
3. In the SQL editor:
   ```sql
   update creators set owner_id = '<your-auth-user-id>' where handle = 'ananya';
   ```
4. Reload `/ananya` — you'll see the **CREATOR** badge and **＋ New temporary room**.

---

## Verifying the realtime loop

- **Two browsers, same room** → messages appear for both in <1s; the "N here" count is
  accurate and updates as people come and go.
- **Creator opens a 1-hour room** → it appears in a second browser instantly, and
  auto-disappears at expiry (the cron sweep flips `is_open=false`; occupants get bounced).

To exercise auto-close locally without waiting on Vercel Cron, hit the route yourself:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/close-rooms
```

(Prefer an in-database sweep? The migration includes a commented `pg_cron` alternative.)

---

## Deploy

1. Push to GitHub and import the repo in **Vercel**.
2. Add the same env vars in the Vercel project settings.
3. [`vercel.json`](vercel.json) already registers the cron that calls
   `/api/cron/close-rooms` (daily — the max frequency on Vercel's free Hobby plan;
   tighten it on Pro). With `CRON_SECRET` set, Vercel authenticates the call
   automatically. Expired rooms also disappear instantly client-side, so the
   sweep interval only affects how quickly the DB `is_open` flag is tidied.
4. Update `NEXT_PUBLIC_SITE_URL` and the Google redirect URL to your production domain.

### Analytics (optional)

Set `NEXT_PUBLIC_POSTHOG_KEY` (and host) to enable the funnel:
**arrival → join → first message** (`space_arrived`, `room_joined`, `first_message_sent`,
plus `temporary_room_created`). Without a key, all tracking is a no-op.

---

## Project layout

```
app/
  [handle]/                     Space (server) + space-client (realtime, sheets)
  [handle]/room/[roomId]/       Room (server) + chat-client (realtime, presence, reactions)
  auth/callback/                OAuth code exchange
  api/cron/close-rooms/         Auto-close sweep (Bearer CRON_SECRET)
components/                     RoomCard, JoinSheet, CreateRoomSheet, Toast, ...
lib/                            supabase clients, presence/user hooks, rooms + auth helpers
supabase/migrations/0001_init.sql
```

## Scripts

```bash
npm run dev        # local dev
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```
