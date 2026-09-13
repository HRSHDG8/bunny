"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/supabase/errors";

export interface FlightInput {
  traveler_id: string;
  airline: string;
  flight_number: string;
  departure_place: string;
  departure_code: string;
  departure_time: string;
  arrival_place: string;
  arrival_code: string;
  arrival_time: string;
  booking_ref: string;
  seat: string;
  notes: string;
}

function tripPaths(tripId: string) {
  return [`/trips/${tripId}`, `/trips/${tripId}/flights`];
}

export async function createFlight(tripId: string, input: FlightInput) {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("flights")
    .insert({
      id,
      trip_id: tripId,
      traveler_id: input.traveler_id || null,
      airline: input.airline || null,
      flight_number: input.flight_number || null,
      departure_place: input.departure_place || null,
      departure_code: input.departure_code || null,
      departure_time: input.departure_time || null,
      arrival_place: input.arrival_place || null,
      arrival_code: input.arrival_code || null,
      arrival_time: input.arrival_time || null,
      booking_ref: input.booking_ref || null,
      seat: input.seat || null,
      notes: input.notes || null,
    });
  if (error) throw apiError("Couldn't save the flight.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return id;
}

export async function updateFlight(id: string, tripId: string, input: FlightInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("flights")
    .update({
      traveler_id: input.traveler_id || null,
      airline: input.airline || null,
      flight_number: input.flight_number || null,
      departure_place: input.departure_place || null,
      departure_code: input.departure_code || null,
      departure_time: input.departure_time || null,
      arrival_place: input.arrival_place || null,
      arrival_code: input.arrival_code || null,
      arrival_time: input.arrival_time || null,
      booking_ref: input.booking_ref || null,
      seat: input.seat || null,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw apiError("Couldn't save the flight.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteFlight(id: string, tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("flights").delete().eq("id", id);
  if (error) throw apiError("Couldn't delete the flight.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}