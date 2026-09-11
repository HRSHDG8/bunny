"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface RentalInput {
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
  const { data, error } = await supabase
    .from("rentals")
    .insert({
      trip_id: tripId,
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
    .select()
    .single();
  if (error) throw new Error("Couldn't save the rental.");
  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return data.id;
}

export async function updateRental(id: string, tripId: string, input: RentalInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("rentals")
    .update({
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
  if (error) throw new Error("Couldn't save the rental.");
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteRental(id: string, tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("rentals").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the rental.");
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}