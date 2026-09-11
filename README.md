# bunny — trip planning, beautifully organized

A Next.js travel itinerary planner backed by Supabase. Plan every day of a
trip: flights, a rental car (right down to the plate number), and a
day-by-day itinerary with searched places, rough times, and notes — all styled
like a stamped passport.

## Features

- **Auth** — Google OAuth *and* email/password via Supabase Auth
- **Trips** — name, destination, date range, arrival method + notes
- **Flights** — boarding-pass style cards: airline, flight number, airports,
  times, seat, booking reference
- **Rental** — company, model, pickup/drop-off, booking ref, and an amber
  "car no" plate that you fill in when you collect the car
- **Itinerary** — per-day planning with a live OSM map, note + rough times per
  spot, reordering, and real place search (OpenStreetMap/Photon)

## Stack

- Next.js 16 (App Router, Turbopack, React 19) + TypeScript + Tailwind CSS v4
- Supabase (Postgres + Auth), `@supabase/ssr`
- Place search proxy: [Photon / Komoot](https://photon.komoot.io) (free, no key)
- Map preview: OpenStreetMap embed iframe
- date-fns, lucide-react, sonner

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Open **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Paste into a new `.env.local` (copy from `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

### 3. Create the database tables

Open **SQL Editor** → New query, paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the
`trips`, `flights`, `rentals`, and `itinerary_items` tables with Row Level
Security so users can only see their own data.

### 4. Enable auth providers

In **Supabase Dashboard → Authentication → Sign In / Up**:

- **Email** — enable "Email" provider (leave confirmation on for safety).
  This powers the email/password form.
- **Google** — enable "Google", then in the Google console add your
  `http://localhost:3000/auth/callback` as an authorized redirect URI.

In **Authentication → URL Configuration**, add these redirect URLs:

```
http://localhost:3000/auth/callback
http://localhost:3000/login
```

### 5. Run it

```bash
pnpm dev
```

Open http://localhost:3000. Without a Google/email account you can also create
one with the "Create an account" toggle on the login page.

## Deploying

- Deploy to **Vercel** (or anywhere Next.js runs). Set the same two env vars.
- Add your production URL (e.g. `https://app.example.com/auth/callback`) to the
  Supabase redirect allow-list, and update the Google OAuth authorized origins.

## Notes

- Place search calls Photon (OpenStreetMap) through `src/app/api/geo/search/route.ts`.
  It needs no API key. To swap providers, change the fetch in that file.
- Day numbers map to trip dates: day 1 = `start_date`, day N = `start_date + N - 1`.
- The map preview uses the OpenStreetMap embed; no iframe allow-list needed.