import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError } from "@/lib/supabase/errors";

export interface StayInput {
  name: string;
  place_name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  check_in: string;
  check_out: string;
  booking_ref: string;
  notes: string;
}

function validateName(name: string) {
  if (!name.trim()) throw new Error("Give the stay a name.");
}

function row(input: StayInput) {
  return {
    name: input.name.trim() || null,
    place_name: input.place_name.trim() || null,
    address: input.address.trim() || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    check_in: input.check_in || null,
    check_out: input.check_out || null,
    booking_ref: input.booking_ref.trim() || null,
    notes: input.notes.trim() || null,
  };
}

export async function createStay(
  supabase: SupabaseClient,
  tripId: string,
  input: StayInput,
): Promise<string> {
  validateName(input.name);
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("stays")
    .insert({ id, trip_id: tripId, ...row(input) });
  if (error) throw apiError("Couldn't save the stay.", error);
  return id;
}

export async function updateStay(
  supabase: SupabaseClient,
  stayId: string,
  tripId: string,
  input: StayInput,
) {
  validateName(input.name);
  const { error } = await supabase
    .from("stays")
    .update(row(input))
    .eq("id", stayId)
    .eq("trip_id", tripId);
  if (error) throw apiError("Couldn't save the stay.", error);
}

export async function deleteStay(
  supabase: SupabaseClient,
  stayId: string,
  tripId: string,
) {
  const { error } = await supabase
    .from("stays")
    .delete()
    .eq("id", stayId)
    .eq("trip_id", tripId);
  if (error) throw apiError("Couldn't delete the stay.", error);
}
