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
- **MCP server** — let Claude plan trips in bunny, over OAuth 2.1, as you

## Stack

- Next.js 16 (App Router, Turbopack, React 19) + TypeScript + Tailwind CSS v4
- Supabase (Postgres + Auth), `@supabase/ssr`
- Model Context Protocol: `@modelcontextprotocol/server` v2 + `mcp-handler`
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

## The MCP server (Claude)

bunny speaks the Model Context Protocol, so Claude can create trips, add
flights and rentals, build itineraries and plan a whole trip in one go —
acting as you, with the same permissions the web app has.

- Endpoint: `https://<your-domain>/api/mcp`
- Transport: Streamable HTTP, OAuth 2.1 (authorization code + PKCE, refresh
  token rotation)
- Tools: trips, flights, rentals, itinerary, trip people, invites, airport and
  place lookup, and a composite `plan_trip`

### Setup

1. **Apply the schema.** Re-run
   [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
   The MCP section (at the bottom) creates `mcp_oauth_clients`,
   `mcp_auth_codes` and `mcp_credentials` — server-only tables, with RLS
   enabled and no policies, reachable only with the service-role key.
2. **Add the env vars** to `.env.local` (and to your host's env):

   ```env
   SUPABASE_SERVICE_ROLE_KEY=<service-role key>
   MCP_TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>
   ```

   The service-role key is used for exactly three things: the MCP credential
   table, the OAuth client registry and the OAuth authorization codes. Every
   trip/flight/rental read or write still goes through the caller's own
   Supabase JWT, so RLS applies exactly as it does in the app. The encryption
   key encrypts the stored Supabase sessions at rest; changing it invalidates
   every existing connection.
3. **Connect it.** In Claude (claude.ai) → Settings → Connectors → Add custom
   connector, and use the server URL above. bunny's sign-in page takes over
   from there: the user approves the connection with their bunny account.
   Connected apps can be reviewed and revoked at `/settings`.

### Endpoints

| Path | What it is |
| --- | --- |
| `POST/GET /api/mcp` | the MCP server itself (bearer token required) |
| `GET /api/mcp/oauth/authorize` | OAuth authorization endpoint (PKCE S256) |
| `POST /api/mcp/oauth/token` | token endpoint (code + refresh grants) |
| `POST /api/mcp/oauth/register` | dynamic client registration (RFC 7591) |
| `POST /api/mcp/oauth/revoke` | token revocation (RFC 7009) |
| `GET /.well-known/oauth-authorization-server` | authorization server metadata |
| `GET /.well-known/oauth-protected-resource` | protected resource metadata |

## Notes

- Place search calls Photon (OpenStreetMap) through `src/lib/places.ts`.
  It needs no API key. To swap providers, change the fetch in that file.
- Day numbers map to trip dates: day 1 = `start_date`, day N = `start_date + N - 1`.
- The map preview uses the OpenStreetMap embed; no iframe allow-list needed.
- Domain logic lives in `src/lib/services/*` so the web app and the MCP tools
  share the same validation and rules.