import type { SupabaseClient } from "@supabase/supabase-js";
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

function row(input: RentalInput) {
  return {
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
  };
}

export async function createRental(
  supabase: SupabaseClient,
  tripId: string,
  input: RentalInput,
): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("rentals")
    .insert({ id, trip_id: tripId, ...row(input) });
  if (error) throw apiError("Couldn't save the rental.", error);
  return id;
}

export async function updateRental(
  supabase: SupabaseClient,
  rentalId: string,
  tripId: string,
  input: RentalInput,
) {
  const { error } = await supabase
    .from("rentals")
    .update(row(input))
    .eq("id", rentalId);
  if (error) throw apiError("Couldn't save the rental.", error);
}

export async function deleteRental(
  supabase: SupabaseClient,
  rentalId: string,
  tripId: string,
) {
  const { error } = await supabase
    .from("rentals")
    .delete()
    .eq("id", rentalId)
    .eq("trip_id", tripId);
  if (error) throw apiError("Couldn't delete the rental.", error);
}
