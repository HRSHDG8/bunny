-- ═══════════════════════════════════════════════════════════════
--  bunny — trip planning schema
--  Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--  Safe to re-run: statements are written to be idempotent.
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
create table if not exists public.trips (
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

-- sharing: secret token for the invite link + optional email allowlist
-- (empty = anyone signed in with the link can join)
alter table public.trips add column if not exists share_token  text;
alter table public.trips add column if not exists share_emails text[] not null default '{}';

create unique index if not exists trips_share_token_idx on public.trips(share_token);
create index if not exists trips_user_id_idx on public.trips(user_id);

drop trigger if exists trips_updated_at on public.trips;
create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ── flights ────────────────────────────────────────────────────
create table if not exists public.flights (
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

create index if not exists flights_trip_id_idx on public.flights(trip_id);

-- each flight can be assigned to one traveler; NULL = applies to the whole trip
alter table public.flights add column if not exists traveler_id uuid references auth.users(id) on delete set null;
create index if not exists flights_traveler_idx on public.flights(traveler_id);

drop trigger if exists flights_updated_at on public.flights;
create trigger flights_updated_at
  before update on public.flights
  for each row execute function public.set_updated_at();

-- ── rentals ────────────────────────────────────────────────────
create table if not exists public.rentals (
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

create index if not exists rentals_trip_id_idx on public.rentals(trip_id);

-- optional assigned drivers (trip members); empty = whole trip
alter table public.rentals add column if not exists driver_ids uuid[] not null default '{}';

drop trigger if exists rentals_updated_at on public.rentals;
create trigger rentals_updated_at
  before update on public.rentals
  for each row execute function public.set_updated_at();

-- ── itinerary_items ────────────────────────────────────────────
-- day_number is 1-based: 1 = start_date, 2 = start_date+1, ...
create table if not exists public.itinerary_items (
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

create index if not exists itinerary_trip_day_idx on public.itinerary_items(trip_id, day_number, sort_order);

drop trigger if exists itinerary_items_updated_at on public.itinerary_items;
create trigger itinerary_items_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

-- ── trip_members (shared trips) ────────────────────────────────
-- role: 'editor' can plan together, 'viewer' is read-only.
create table if not exists public.trip_members (
  trip_id   uuid not null references public.trips(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'editor' check (role in ('editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
--  RLS helper functions
--  SECURITY DEFINER so the calls from within RLS policies don't
--  recurse into the same tables. They only ever answer "is the
--  caller (auth.uid()) a participant/editor?" — nothing else is
--  leaked, and re-execute is locked to the `authenticated` role.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.is_trip_participant(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select t.user_id from public.trips t where t.id = p_trip_id) = auth.uid()
    or exists (select 1 from public.trip_members m
               where m.trip_id = p_trip_id and m.user_id = auth.uid())
  );
$$;

create or replace function public.is_trip_editor(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select t.user_id from public.trips t where t.id = p_trip_id) = auth.uid()
    or exists (select 1 from public.trip_members m
               where m.trip_id = p_trip_id and m.user_id = auth.uid() and m.role = 'editor')
  );
$$;

revoke execute on function public.is_trip_participant(uuid) from public, anon;
grant  execute on function public.is_trip_participant(uuid) to authenticated;
revoke execute on function public.is_trip_editor(uuid) from public, anon;
grant  execute on function public.is_trip_editor(uuid) to authenticated;

-- ── who's on the trip ───────────────────────────────────────────
-- Names the owner + everyone who joined via invite link, so the UI can
-- assign flights/rentals to specific people. SECURITY DEFINER but gated
-- on is_trip_participant, so only trip members can list the people.
create or replace function public.trip_people(p_trip_id uuid)
returns table (user_id uuid, full_name text, email text, is_owner boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_trip_participant(p_trip_id) then
    return;
  end if;

  -- explicit ::text casts matter: auth.users.email is citext, and Postgres
  -- refuses to assign a citext column to a text RETURNS TABLE column.
  -- Table-qualified columns matter too: RETURNS TABLE puts user_id in scope
  -- as a variable, so a bare `user_id` here would be ambiguous.
  return query
    select p.user_id,
           coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(u.email, ''), '@', 1))::text,
           u.email::text,
           (t.user_id = p.user_id)
      from (
        select tr.user_id from public.trips tr where tr.id = p_trip_id
        union
        select m.user_id from public.trip_members m where m.trip_id = p_trip_id
      ) p
      join auth.users u on u.id = p.user_id
      left join public.trips t on t.id = p_trip_id
     order by u.email;
end;
$$;

revoke execute on function public.trip_people(uuid) from public, anon;
grant  execute on function public.trip_people(uuid) to authenticated;

-- ── join via invite link ───────────────────────────────────────
-- The only way (besides the trip owner) to add a member. Validates the
-- share token, requires a signed-in user, and — when the trip limits
-- sharing to an allowlist — requires the caller's confirmed email from
-- `auth.users` (never editable user_metadata) to be on that list.
create or replace function public.join_trip(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id  uuid;
  v_email    text;
  v_allowed  text[];
begin
  if p_token is null or p_token = '' then
    raise exception 'This invite link is missing.';
  end if;
  if auth.uid() is null then
    raise exception 'Sign in to join a trip.';
  end if;

  select t.id, t.share_emails into v_trip_id, v_allowed
  from public.trips t
  where t.share_token = p_token;

  if v_trip_id is null then
    raise exception 'This invite link is invalid or has been revoked.';
  end if;

  -- owner opening their own link is a no-op
  if exists (select 1 from public.trips t
             where t.id = v_trip_id and t.user_id = auth.uid()) then
    return v_trip_id;
  end if;

  -- already a member → idempotent
  if not exists (select 1 from public.trip_members m
                 where m.trip_id = v_trip_id and m.user_id = auth.uid()) then

    if exists (select 1 from public.trips t
               where t.id = v_trip_id and t.end_date < current_date) then
      raise exception 'This trip has already ended and can''t be joined.';
    end if;

    if cardinality(v_allowed) > 0 then
      select email::text into v_email from auth.users where id = auth.uid();
      if v_email is null or not exists (
        select 1 from unnest(v_allowed) as a(user_email)
        where lower(a.user_email) = lower(v_email)
      ) then
        raise exception 'This invite link is reserved for specific people.';
      end if;
    end if;

    insert into public.trip_members (trip_id, user_id, role)
    values (v_trip_id, auth.uid(), 'editor')
    on conflict (trip_id, user_id) do nothing;
  end if;

  return v_trip_id;
end;
$$;

revoke execute on function public.join_trip(text) from public, anon;
grant  execute on function public.join_trip(text) to authenticated;

-- ── invite preview (read-only fields for the /join confirmation) ─
-- Lets a signed-in user with a valid token see where a trip invite
-- leads *before* they join. Only ever returns non-private basics.
create or replace function public.trip_for_invite(p_token text)
returns table (title text, destination text, start_date date, end_date date)
language sql
stable
security definer
set search_path = ''
as $$
  select t.title, t.destination, t.start_date, t.end_date
  from public.trips t
  where t.share_token = p_token;
$$;

revoke execute on function public.trip_for_invite(text) from public, anon;
grant  execute on function public.trip_for_invite(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════
--  Trip lifecycle rules
--  (1) A person can have at most 5 ACTIVE trips (end_date >= today)
--      among the trips they created. Enforced in a BEFORE INSERT
--      trigger so rapid double-submits can't slip by an app-side
--      check. Completed trips (end_date < today) don't count.
--  (2) A COMPLETED trip (end_date < today) is immutable: no edits to
--      the trip or any of its children, no deletes, no sharing
--      changes, no new members. Enforced in triggers that always
--      run — through SECURITY DEFINER functions like join_trip too —
--      and for every role, not just max_editors.
--  Both are SECURITY DEFINER so the counts/lookups are immune to RLS.
-- ═══════════════════════════════════════════════════════════════

-- (1) active-trip quota on create
create or replace function public.check_trip_active_limit()
returns trigger
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_active integer;
begin
  select count(*) into v_active
    from public.trips
   where user_id = new.user_id
     and end_date >= current_date;

  if v_active >= 5 then
    raise exception 'You can have up to 5 active trips at once.'
      using errcode = 'check_violation',
            hint = 'A trip frees its slot once its end date passes.';
  end if;

  return new;
end;
$$;

drop trigger if exists trips_active_limit on public.trips;
create trigger trips_active_limit
  before insert on public.trips
  for each row execute function public.check_trip_active_limit();

-- Is a trip completed (end date in the past)?
create or replace function public.trip_is_completed(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.end_date < current_date
  );
$$;

-- (2a) freeze the trip row itself
create or replace function public.prevent_edits_on_completed_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed boolean;
begin
  if tg_op = 'UPDATE' then
    v_completed := new.end_date < current_date;
  else
    v_completed := old.end_date < current_date;
  end if;

  if v_completed then
    raise exception 'This trip has been completed and is now locked - it can''t be changed.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists trips_no_edits_when_completed on public.trips;
create trigger trips_no_edits_when_completed
  before update or delete on public.trips
  for each row execute function public.prevent_edits_on_completed_trip();

-- (2b) freeze child rows of a completed trip (flights, rentals,
--      itinerary_items, trip_members)
create or replace function public.prevent_child_edits_on_completed_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  v_trip_id := coalesce(new.trip_id, old.trip_id);

  if public.trip_is_completed(v_trip_id) then
    raise exception 'This trip has been completed and is now locked - it can''t be changed.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists flights_no_edits_when_completed on public.flights;
create trigger flights_no_edits_when_completed
  before insert or update or delete on public.flights
  for each row execute function public.prevent_child_edits_on_completed_trip();

drop trigger if exists rentals_no_edits_when_completed on public.rentals;
create trigger rentals_no_edits_when_completed
  before insert or update or delete on public.rentals
  for each row execute function public.prevent_child_edits_on_completed_trip();

drop trigger if exists itinerary_no_edits_when_completed on public.itinerary_items;
create trigger itinerary_no_edits_when_completed
  before insert or update or delete on public.itinerary_items
  for each row execute function public.prevent_child_edits_on_completed_trip();

drop trigger if exists trip_members_no_edits_when_completed on public.trip_members;
create trigger trip_members_no_edits_when_completed
  before insert or update or delete on public.trip_members
  for each row execute function public.prevent_child_edits_on_completed_trip();

-- ═══════════════════════════════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════════════════════════════

alter table public.trips             enable row level security;
alter table public.flights           enable row level security;
alter table public.rentals           enable row level security;
alter table public.itinerary_items   enable row level security;
alter table public.trip_members      enable row level security;

-- ── trips: owner always; members read; owner/editors change ───
drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own" on public.trips
  for select to authenticated
  using ( public.is_trip_participant(id) );

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips
  for insert to authenticated
  with check ( auth.uid() = user_id );

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own" on public.trips
  for update to authenticated
  using ( public.is_trip_editor(id) )
  with check ( user_id = (select t.user_id from public.trips t where t.id = trips.id) );

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own" on public.trips
  for delete to authenticated
  using ( auth.uid() = user_id );

-- ── children: read for participants, change for owner/editors ──
drop policy if exists "flights_select_own" on public.flights;
create policy "flights_select_own" on public.flights
  for select to authenticated
  using ( public.is_trip_participant(trip_id) );

drop policy if exists "flights_insert_own" on public.flights;
create policy "flights_insert_own" on public.flights
  for insert to authenticated
  with check ( public.is_trip_editor(trip_id) );

drop policy if exists "flights_update_own" on public.flights;
create policy "flights_update_own" on public.flights
  for update to authenticated
  using ( public.is_trip_editor(trip_id) );

drop policy if exists "flights_delete_own" on public.flights;
create policy "flights_delete_own" on public.flights
  for delete to authenticated
  using ( public.is_trip_editor(trip_id) );

drop policy if exists "rentals_select_own" on public.rentals;
create policy "rentals_select_own" on public.rentals
  for select to authenticated
  using ( public.is_trip_participant(trip_id) );

drop policy if exists "rentals_insert_own" on public.rentals;
create policy "rentals_insert_own" on public.rentals
  for insert to authenticated
  with check ( public.is_trip_editor(trip_id) );

drop policy if exists "rentals_update_own" on public.rentals;
create policy "rentals_update_own" on public.rentals
  for update to authenticated
  using ( public.is_trip_editor(trip_id) );

drop policy if exists "rentals_delete_own" on public.rentals;
create policy "rentals_delete_own" on public.rentals
  for delete to authenticated
  using ( public.is_trip_editor(trip_id) );

drop policy if exists "itinerary_select_own" on public.itinerary_items;
create policy "itinerary_select_own" on public.itinerary_items
  for select to authenticated
  using ( public.is_trip_participant(trip_id) );

drop policy if exists "itinerary_insert_own" on public.itinerary_items;
create policy "itinerary_insert_own" on public.itinerary_items
  for insert to authenticated
  with check ( public.is_trip_editor(trip_id) );

drop policy if exists "itinerary_update_own" on public.itinerary_items;
create policy "itinerary_update_own" on public.itinerary_items
  for update to authenticated
  using ( public.is_trip_editor(trip_id) );

drop policy if exists "itinerary_delete_own" on public.itinerary_items;
create policy "itinerary_delete_own" on public.itinerary_items
  for delete to authenticated
  using ( public.is_trip_editor(trip_id) );

-- ── trip_members: participants can read, owner manages, ─────────
--    membership is created through join_trip() only.
drop policy if exists "trip_members_select_participant" on public.trip_members;
create policy "trip_members_select_participant" on public.trip_members
  for select to authenticated
  using ( public.is_trip_participant(trip_id) );

drop policy if exists "trip_members_manage_owner" on public.trip_members;
create policy "trip_members_manage_owner" on public.trip_members
  for all to authenticated
  using (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = auth.uid())
  );

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
grant select, insert, update, delete on table public.trip_members    to authenticated;

-- Keep future tables in `public` reachable via the Data API too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- Refresh PostgREST's schema cache so the new tables/columns are
-- immediately reachable over the Data API.
notify pgrst, 'reload schema';