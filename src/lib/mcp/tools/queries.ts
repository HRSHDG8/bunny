import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError } from "@/lib/supabase/errors";
import type {
  Flight,
  ItineraryItem,
  Rental,
  Trip,
  TripPerson,
} from "@/lib/types";

export async function loadTrip(supabase: SupabaseClient, tripId: string) {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the trip.", error);
  if (!data) throw new Error("That trip doesn't exist, or you don't have access to it.");
  return data as Trip;
}

export async function loadFlights(supabase: SupabaseClient, tripId: string) {
  const { data, error } = await supabase
    .from("flights")
    .select("*, flight_passengers(*)")
    .eq("trip_id", tripId)
    .order("departure_at", { ascending: true, nullsFirst: false })
    .order("departure_time", { ascending: true });
  if (error) throw apiError("Couldn't load the flights.", error);
  return (data ?? []) as Flight[];
}

export async function loadFlight(
  supabase: SupabaseClient,
  flightId: string,
) {
  const { data, error } = await supabase
    .from("flights")
    .select("*, flight_passengers(*)")
    .eq("id", flightId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the flight.", error);
  if (!data)
    throw new Error("That flight doesn't exist, or you don't have access to it.");
  return data as Flight;
}

export async function loadRentals(supabase: SupabaseClient, tripId: string) {
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("trip_id", tripId)
    .order("pickup_time", { ascending: true });
  if (error) throw apiError("Couldn't load the rentals.", error);
  return (data ?? []) as Rental[];
}

export async function loadRental(supabase: SupabaseClient, rentalId: string) {
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the rental.", error);
  if (!data)
    throw new Error("That rental doesn't exist, or you don't have access to it.");
  return data as Rental;
}

export async function loadItinerary(supabase: SupabaseClient, tripId: string) {
  const { data, error } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw apiError("Couldn't load the itinerary.", error);
  return (data ?? []) as ItineraryItem[];
}

export async function loadItineraryItem(
  supabase: SupabaseClient,
  itemId: string,
) {
  const { data, error } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the activity.", error);
  if (!data)
    throw new Error("That activity doesn't exist, or you don't have access to it.");
  return data as ItineraryItem;
}

export async function loadPeople(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripPerson[]> {
  const { data, error } = await supabase.rpc("trip_people", {
    p_trip_id: tripId,
  });
  if (error) throw apiError("Couldn't load who's on this trip.", error);
  return (data ?? []) as TripPerson[];
}

export function isCompleted(trip: Pick<Trip, "end_date">) {
  return trip.end_date < new Date().toISOString().slice(0, 10);
}

/** Compact view of a trip, used in list responses. */
export function tripSummary(trip: Trip) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    arrival_method: trip.arrival_method,
    arrival_notes: trip.arrival_notes,
    completed: isCompleted(trip),
    sharing: trip.share_token
      ? {
          enabled: true,
          invite_path: `/join?token=${trip.share_token}`,
          invite_url: appUrl
            ? `${appUrl.replace(/\/$/, "")}/join?token=${trip.share_token}`
            : null,
          allowed_emails: trip.share_emails ?? [],
        }
      : { enabled: false, invite_path: null, invite_url: null, allowed_emails: [] },
  };
}
