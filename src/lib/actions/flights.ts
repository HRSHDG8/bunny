"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createFlight as createFlightService,
  deleteFlight as deleteFlightService,
  updateFlight as updateFlightService,
  type FlightInput,
  type FlightPassengerInput,
} from "@/lib/services/flights";

export type { FlightInput, FlightPassengerInput };

function tripPaths(tripId: string) {
  return [`/trips/${tripId}`, `/trips/${tripId}/flights`];
}

export async function createFlight(tripId: string, input: FlightInput) {
  const supabase = await createClient();
  const id = await createFlightService(supabase, tripId, input);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return id;
}

export async function updateFlight(id: string, tripId: string, input: FlightInput) {
  const supabase = await createClient();
  await updateFlightService(supabase, id, tripId, input);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteFlight(id: string, tripId: string) {
  const supabase = await createClient();
  await deleteFlightService(supabase, id, tripId);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}
