import { eachDayOfInterval, format } from "date-fns";
import { createClient, requireUser } from "@/lib/supabase/server";
import type {
  Flight,
  ItineraryItem,
  Rental,
  Trip,
  TripMember,
  TripPerson,
  TripPreview,
} from "@/lib/types";

export class NotFoundError extends Error {}

type ApiErr = {
  code?: string | null;
  message?: string | null;
  hint?: string | null;
};

function dataError(label: string, error: ApiErr | null): Error {
  let msg = error?.message?.trim() || "";
  if (msg && msg.startsWith("{")) {
    try {
      const body = JSON.parse(msg) as {
        message?: string;
        error?: string;
        msg?: string;
      };
      msg = body?.message ?? body?.error ?? body?.msg ?? msg;
    } catch {
      // not JSON - keep the raw message
    }
  }
  const dead =
    !msg ||
    /timed?\s?out|gateway|network|fetch failed|econnreset|502|504|no route/i.test(
      msg,
    );
  return new Error(
    dead
      ? `${label} - Supabase is unreachable right now, please retry.`
      : `${label} - ${msg}`,
  );
}

export async function getCurrentUser() {
  return requireUser();
}

export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw dataError("Couldn't load your trips", error);
  return data;
}

export async function getTrip(id: string): Promise<Trip> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new NotFoundError("Not authorized");

  // Row-level security limits this to the owner and invited members.
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) throw new NotFoundError("Trip not found");
  return data;
}

export async function getTripMembership(
  tripId: string,
): Promise<TripMember | null> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("trip_members")
    .select("*")
    .eq("trip_id", tripId)
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getTripPreview(token: string): Promise<TripPreview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trip_for_invite", {
    p_token: token,
  });
  if (error || !data || data.length === 0)
    throw new NotFoundError("Invite not found");
  return data[0];
}

export async function getFlights(tripId: string): Promise<Flight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flights")
    .select("*")
    .eq("trip_id", tripId)
    .order("departure_time", { ascending: true });
  if (error) throw dataError("Couldn't load the flights", error);
  return data;
}

export async function getRentals(tripId: string): Promise<Rental[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("trip_id", tripId)
    .order("pickup_time", { ascending: true });
  if (error) throw dataError("Couldn't load the rental", error);
  return data;
}

export async function getItinerary(tripId: string): Promise<ItineraryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw dataError("Couldn't load the itinerary", error);
  return data;
}

export async function getTripPeople(tripId: string): Promise<TripPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trip_people", {
    p_trip_id: tripId,
  });
  if (error) throw dataError("Couldn't load who's on this trip", error);
  return (data ?? []) as TripPerson[];
}

export function isTripCompleted(trip: Pick<Trip, "end_date">) {
  const today = new Date().toISOString().slice(0, 10);
  return trip.end_date < today;
}

export async function getActiveTripCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("end_date", today);
  if (error) throw dataError("Couldn't check your trip count", error);
  return count ?? 0;
}

export function tripDays(trip: Pick<Trip, "start_date" | "end_date">) {
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  return eachDayOfInterval({ start, end }).map((date, i) => ({
    dayNumber: i + 1,
    date: format(date, "yyyy-MM-dd"),
    label: format(date, "EEE, MMM d"),
  }));
}

export function dayCount(trip: Pick<Trip, "start_date" | "end_date">) {
  return tripDays(trip).length;
}