-- ═══════════════════════════════════════════════════════════════
--  bunny — trip planning schema
--  Run this in the Supabase SQL editor (Dashboard → SQL → New query)
--
--  Note: new tables are NO LONGER auto-exposed to the Data API
--  (`supabase.from(...)`). Grants below for `authenticated` are what
--  make the tables reachable over REST/PostgREST for signed-in users.
-- ═══════════════════════════════════════════════════════════════

-- ── extension for gen_random_uuid() ────────────────────────────
create extension if not exists "pgcrypto";

-- ── updated_at helper ──────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── trips ──────────────────────────────────────────────────────
create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  destination    text not null,
  start_date     date not null,
  end_date       date not null,
  arrival_method text check (arrival_method in ('flight','train','drive','cruise','other')),
  arrival_notes  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index trips_user_id_idx on public.trips(user_id);

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ── flights ────────────────────────────────────────────────────
create table public.flights (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  airline          text,
  flight_number    text,
  departure_place  text,
  departure_code   text,
  departure_time   timestamptz,
  arrival_place    text,
  arrival_code     text,
  arrival_time     timestamptz,
  booking_ref      text,
  seat             text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index flights_trip_id_idx on public.flights(trip_id);

create trigger flights_updated_at
  before update on public.flights
  for each row execute function public.set_updated_at();

-- ── rentals ────────────────────────────────────────────────────
create table public.rentals (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  company        text,
  booking_ref    text,
  car_model      text,
  car_plate      text,   -- "car no" — recorded when you collect the car
  pickup_place   text,
  pickup_time    timestamptz,
  dropoff_place  text,
  dropoff_time   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index rentals_trip_id_idx on public.rentals(trip_id);

create trigger rentals_updated_at
  before update on public.rentals
  for each row execute function public.set_updated_at();

-- ── itinerary_items ────────────────────────────────────────────
-- day_number is 1-based: 1 = start_date, 2 = start_date+1, ...
create table public.itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day_number integer not null,
  title      text not null,
  place_name text,
  lat        double precision,
  lng        double precision,
  start_time time,
  end_time   time,
  notes      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_day_number check (day_number >= 1)
);

create index itinerary_trip_day_idx on public.itinerary_items(trip_id, day_number, sort_order);

create trigger itinerary_items_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════════════════════════════

alter table public.trips             enable row level security;
alter table public.flights           enable row level security;
alter table public.rentals           enable row level security;
alter table public.itinerary_items   enable row level security;

-- trips: owned by the signed-in user
create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);
create policy "trips_insert_own" on public.trips
  for insert with check (auth.uid() = user_id);
create policy "trips_update_own" on public.trips
  for update using (auth.uid() = user_id);
create policy "trips_delete_own" on public.trips
  for delete using (auth.uid() = user_id);

-- children: visible when the parent trip is owned by the user
create policy "flights_select_own" on public.flights
  for select using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "flights_insert_own" on public.flights
  for insert with check (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "flights_update_own" on public.flights
  for update using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "flights_delete_own" on public.flights
  for delete using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "rentals_select_own" on public.rentals
  for select using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "rentals_insert_own" on public.rentals
  for insert with check (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "rentals_update_own" on public.rentals
  for update using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "rentals_delete_own" on public.rentals
  for delete using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "itinerary_select_own" on public.itinerary_items
  for select using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "itinerary_insert_own" on public.itinerary_items
  for insert with check (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "itinerary_update_own" on public.itinerary_items
  for update using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "itinerary_delete_own" on public.itinerary_items
  for delete using (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
--  Data API access
--  Tables aren't exposed to the Data API unless a role is granted
--  privileges. RLS policies above gate which rows each role can touch.
-- ═══════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated;

-- `anon` deliberately gets NO table grants — every row belongs to a
-- signed-in user, so anonymous requests have nothing to read or write.
-- `authenticated`: full CRUD; RLS restricts rows to the caller's trips.
grant select, insert, update, delete on table public.trips           to authenticated;
grant select, insert, update, delete on table public.flights         to authenticated;
grant select, insert, update, delete on table public.rentals         to authenticated;
grant select, insert, update, delete on table public.itinerary_items to authenticated;

-- Keep future tables in `public` reachable via the Data API too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;