import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError } from "@/lib/supabase/errors";
import { timezoneForCode } from "@/lib/airports";

export interface FlightPassengerInput {
  user_id: string;
  seat: string;
}

export interface FlightInput {
  airline: string;
  flight_number: string;
  departure_place: string;
  departure_code: string;
  /** Naive wall clock "yyyy-MM-ddTHH:mm" (local to the departure airport). */
  departure_time: string;
  arrival_place: string;
  arrival_code: string;
  /** Naive wall clock "yyyy-MM-ddTHH:mm" (local to the arrival airport). */
  arrival_time: string;
  /** Flight id whose journey this leg joins; null = standalone. */
  journey_id: string | null;
  booking_ref: string;
  notes: string;
  passengers: FlightPassengerInput[];
}

function passengerRows(
  flightId: string,
  passengers: FlightPassengerInput[],
) {
  return passengers.map((p) => ({
    flight_id: flightId,
    user_id: p.user_id,
    seat: p.seat.trim() || null,
  }));
}

/** Zone is resolved server-side from the airport code; unknown code → null. */
function tzColumns(input: FlightInput) {
  return {
    departure_tz: timezoneForCode(input.departure_code),
    arrival_tz: timezoneForCode(input.arrival_code),
  };
}

/**
 * The form submits the id of a flight to connect to. Group this leg with
 * that flight's journey (its journey_id, or the flight itself if it has
 * none). Only accepted within the same trip; anything else → standalone.
 */
async function resolveJourneyId(
  supabase: SupabaseClient,
  tripId: string,
  journeyWithFlightId: string | null,
): Promise<string | null> {
  if (!journeyWithFlightId) return null;
  const { data, error } = await supabase
    .from("flights")
    .select("id, trip_id, journey_id")
    .eq("id", journeyWithFlightId)
    .maybeSingle();
  if (error || !data || data.trip_id !== tripId) return null;
  return data.journey_id ?? data.id;
}

export async function createFlight(
  supabase: SupabaseClient,
  tripId: string,
  input: FlightInput,
): Promise<string> {
  const id = crypto.randomUUID();
  const journeyId = await resolveJourneyId(supabase, tripId, input.journey_id);

  const { error } = await supabase.from("flights").insert({
    id,
    trip_id: tripId,
    airline: input.airline || null,
    flight_number: input.flight_number || null,
    departure_place: input.departure_place || null,
    departure_code: input.departure_code || null,
    departure_time: input.departure_time || null,
    arrival_place: input.arrival_place || null,
    arrival_code: input.arrival_code || null,
    arrival_time: input.arrival_time || null,
    journey_id: journeyId,
    booking_ref: input.booking_ref || null,
    notes: input.notes || null,
    ...tzColumns(input),
  });
  if (error) throw apiError("Couldn't save the flight.", error);

  if (input.passengers.length > 0) {
    const { error: pErr } = await supabase
      .from("flight_passengers")
      .insert(passengerRows(id, input.passengers));
    if (pErr) throw apiError("Couldn't save the passengers.", pErr);
  }

  return id;
}

export async function updateFlight(
  supabase: SupabaseClient,
  flightId: string,
  tripId: string,
  input: FlightInput,
) {
  const journeyId = await resolveJourneyId(supabase, tripId, input.journey_id);

  const { error } = await supabase
    .from("flights")
    .update({
      airline: input.airline || null,
      flight_number: input.flight_number || null,
      departure_place: input.departure_place || null,
      departure_code: input.departure_code || null,
      departure_time: input.departure_time || null,
      arrival_place: input.arrival_place || null,
      arrival_code: input.arrival_code || null,
      arrival_time: input.arrival_time || null,
      journey_id: journeyId,
      booking_ref: input.booking_ref || null,
      notes: input.notes || null,
      ...tzColumns(input),
    })
    .eq("id", flightId);
  if (error) throw apiError("Couldn't save the flight.", error);

  const { error: delErr } = await supabase
    .from("flight_passengers")
    .delete()
    .eq("flight_id", flightId);
  if (delErr) throw apiError("Couldn't update the passengers.", delErr);

  if (input.passengers.length > 0) {
    const { error: pErr } = await supabase
      .from("flight_passengers")
      .insert(passengerRows(flightId, input.passengers));
    if (pErr) throw apiError("Couldn't save the passengers.", pErr);
  }
}

export async function deleteFlight(
  supabase: SupabaseClient,
  flightId: string,
  tripId: string,
) {
  const { error } = await supabase
    .from("flights")
    .delete()
    .eq("id", flightId)
    .eq("trip_id", tripId);
  if (error) throw apiError("Couldn't delete the flight.", error);
}
