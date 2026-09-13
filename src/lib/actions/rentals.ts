"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/supabase/errors";

export interface RentalInput {
  driver_ids: string[];
  company: string;
  booking_ref: string;
  car_model: string;
  car_plate: string;
  pickup_place: string;
  pickup_time: string;
  dropoff_place: string;
  dropoff_time: string;
  notes: string;
}

function tripPaths(tripId: string) {
  return [`/trips/${tripId}`, `/trips/${tripId}/rental`];
}

export async function createRental(tripId: string, input: RentalInput) {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("rentals")
    .insert({
      id,
      trip_id: tripId,
      driver_ids: input.driver_ids,
      company: input.company || null,
      booking_ref: input.booking_ref || null,
      car_model: input.car_model || null,
      car_plate: input.car_plate || null,
      pickup_place: input.pickup_place || null,
      pickup_time: input.pickup_time || null,
      dropoff_place: input.dropoff_place || null,
      dropoff_time: input.dropoff_time || null,
      notes: input.notes || null,
    });
  if (error) throw apiError("Couldn't save the rental.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return id;
}

export async function updateRental(id: string, tripId: string, input: RentalInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("rentals")
    .update({
      driver_ids: input.driver_ids,
      company: input.company || null,
      booking_ref: input.booking_ref || null,
      car_model: input.car_model || null,
      car_plate: input.car_plate || null,
      pickup_place: input.pickup_place || null,
      pickup_time: input.pickup_time || null,
      dropoff_place: input.dropoff_place || null,
      dropoff_time: input.dropoff_time || null,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw apiError("Couldn't save the rental.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteRental(id: string, tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("rentals").delete().eq("id", id);
  if (error) throw apiError("Couldn't delete the rental.", error);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}