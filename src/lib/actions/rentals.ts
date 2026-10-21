"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createRental as createRentalService,
  deleteRental as deleteRentalService,
  updateRental as updateRentalService,
  type RentalInput,
} from "@/lib/services/rentals";

export type { RentalInput };

function tripPaths(tripId: string) {
  return [`/trips/${tripId}`, `/trips/${tripId}/rental`];
}

export async function createRental(tripId: string, input: RentalInput) {
  const supabase = await createClient();
  const id = await createRentalService(supabase, tripId, input);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return id;
}

export async function updateRental(id: string, tripId: string, input: RentalInput) {
  const supabase = await createClient();
  await updateRentalService(supabase, id, tripId, input);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteRental(id: string, tripId: string) {
  const supabase = await createClient();
  await deleteRentalService(supabase, id, tripId);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}
