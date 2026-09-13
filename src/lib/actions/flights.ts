"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/supabase/errors";

export interface FlightPassengerInput {
  user_id: string;
  seat: string;
}

export interface FlightInput {
  airline: string;
  flight_number: string;
  departure_place: string;
  departure_code: string;
  departure_time: string;
  arrival_place: string;
  arrival_code: string;
  arrival_time: string;
  booking_ref: string;
  notes: string;
  passengers: FlightPassengerInput[];
}

function tripPaths(tripId: string) {
  return [`/trips/${tripId}`, `/trips/${tripId}/flights`];
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

export async function createFlight(tripId: string, input: FlightInput) {
  const supabase = await createClient();
  const id = crypto.randomUUID();

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
    booking_ref: input.booking_ref || null,
    notes: input.notes || null,
  });
  if (error) throw apiError("Couldn't save the flight.", error);

  if (input.passengers.length > 0) {
    const { error: pErr } = await supabase
      .from("flight_passengers")
      .insert(passengerRows(id, input.passengers));
    if (pErr) throw apiError("Couldn't save the passengers.", pErr);
  }

  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return id;
}

export async function updateFlight(id: string, tripId: string, input: FlightInput) {
  const supabase = await createClient();

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
      booking_ref: input.booking_ref || null,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw apiError("Couldn't save the flight.", error);

  const { error: delErr } = await supabase
    .from("flight_passengers")
    .delete()
    .eq("flight_id", id);
  if (delErr) throw apiError("Couldn't update the passengers.", delErr);

  if (input.passengers.length > 0) {
    const { error: pErr } = await supabase
      .from("flight_passengers")
      .insert(passengerRows(id, input.passengers));
    if (pErr) throw apiError("Couldn't save the passengers.", pErr);
  }

  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteFlight(id: string, tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("flights").delete().eq("id", id);
  if (error) throw apiError("Couldn't delete the flight.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}