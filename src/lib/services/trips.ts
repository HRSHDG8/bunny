import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";
import { apiError } from "@/lib/supabase/errors";
import type { ArrivalMethod } from "@/lib/types";

export interface TripInput {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  arrival_method: ArrivalMethod | "";
  arrival_notes?: string;
}

const ACTIVE_TRIP_LIMIT = 5;
const QUOTA_MSG =
  "You can have up to 5 active trips at once. A trip frees its slot once its end date passes.";
const LOCKED_MSG =
  "This trip has been completed and is now locked - it can't be changed.";

export function lockError(error: PostgrestError, fallback: string) {
  if (/up to 5 active trips/i.test(error.message)) return new Error(QUOTA_MSG);
  if (/completed and is now locked/i.test(error.message))
    return new Error(LOCKED_MSG);
  if (/already ended and can't be joined/i.test(error.message))
    return new Error("This trip has already ended and can't be joined.");
  return apiError(fallback, error);
}

export function validateTripInput(input: TripInput) {
  if (!input.title.trim()) throw new Error("Give your trip a name.");
  if (!input.destination.trim()) throw new Error("Where are you headed?");
  if (!input.start_date || !input.end_date)
    throw new Error("Pick start and end dates.");
  if (input.start_date > input.end_date)
    throw new Error("The end date can't be before the start date.");
}

export function parseShareEmails(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

/** Owner-only gate. Throws when the caller does not own the trip. */
export async function assertTripOwner(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
) {
  const { data: trip, error } = await supabase
    .from("trips")
    .select("user_id")
    .eq("id", tripId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the trip.", error);
  if (!trip || trip.user_id !== userId)
    throw new Error("Only the trip owner can do that.");
}

/**
 * Creates a trip and returns its id.
 *
 * The 5-active-trip quota is checked here and again by a database
 * trigger, so a double submit can't slip past it.
 */
export async function createTrip(
  supabase: SupabaseClient,
  userId: string,
  input: TripInput,
): Promise<string> {
  validateTripInput(input);

  const today = new Date().toISOString().slice(0, 10);
  const { count, error: countError } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("end_date", today);
  if (!countError && (count ?? 0) >= ACTIVE_TRIP_LIMIT)
    throw new Error(QUOTA_MSG);

  const id = crypto.randomUUID();
  const { error } = await supabase.from("trips").insert({
    id,
    title: input.title.trim(),
    destination: input.destination.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    arrival_method: input.arrival_method || null,
    arrival_notes: input.arrival_notes?.trim() || null,
    user_id: userId,
    share_token: crypto.randomUUID(),
  });
  if (error) throw lockError(error, "Couldn't create the trip. Please try again.");
  return id;
}

export async function updateTrip(
  supabase: SupabaseClient,
  tripId: string,
  input: TripInput,
) {
  validateTripInput(input);
  const { error } = await supabase
    .from("trips")
    .update({
      title: input.title.trim(),
      destination: input.destination.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      arrival_method: input.arrival_method || null,
      arrival_notes: input.arrival_notes?.trim() || null,
    })
    .eq("id", tripId);
  if (error) throw lockError(error, "Couldn't save the trip.");
}

export async function deleteTrip(supabase: SupabaseClient, tripId: string) {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw lockError(error, "Couldn't delete the trip.");
}

export async function enableTripSharing(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
) {
  await assertTripOwner(supabase, tripId, userId);
  const { data: trip } = await supabase
    .from("trips")
    .select("share_token")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip?.share_token) {
    const { error } = await supabase
      .from("trips")
      .update({ share_token: crypto.randomUUID() })
      .eq("id", tripId);
    if (error) throw lockError(error, "Couldn't turn on sharing for this trip.");
  }
}

export async function revokeTripSharing(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
) {
  await assertTripOwner(supabase, tripId, userId);
  const { error } = await supabase
    .from("trips")
    .update({ share_token: null, share_emails: [] })
    .eq("id", tripId);
  if (error) throw lockError(error, "Couldn't turn off sharing for this trip.");
}

export async function setTripSharingEmails(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
  raw: string,
) {
  await assertTripOwner(supabase, tripId, userId);
  const { error } = await supabase
    .from("trips")
    .update({ share_emails: parseShareEmails(raw) })
    .eq("id", tripId);
  if (error) throw lockError(error, "Couldn't save the guest list for this trip.");
}
