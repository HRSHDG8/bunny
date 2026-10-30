"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createStay as createStayService,
  deleteStay as deleteStayService,
  updateStay as updateStayService,
  type StayInput,
} from "@/lib/services/stays";

export type { StayInput };

function tripPaths(tripId: string) {
  return [
    `/trips/${tripId}`,
    `/trips/${tripId}/stays`,
    `/trips/${tripId}/itinerary`,
  ];
}

export async function createStay(tripId: string, input: StayInput) {
  const supabase = await createClient();
  const id = await createStayService(supabase, tripId, input);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
  return id;
}

export async function updateStay(id: string, tripId: string, input: StayInput) {
  const supabase = await createClient();
  await updateStayService(supabase, id, tripId, input);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}

export async function deleteStay(id: string, tripId: string) {
  const supabase = await createClient();
  await deleteStayService(supabase, id, tripId);
  tripPaths(tripId).forEach((p) => revalidatePath(p));
}
