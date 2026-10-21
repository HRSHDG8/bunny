"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createItineraryItem as createItineraryItemService,
  deleteItineraryItem as deleteItineraryItemService,
  moveItineraryItem as moveItineraryItemService,
  updateItineraryItem as updateItineraryItemService,
  type ItineraryInput,
} from "@/lib/services/itinerary";

export type { ItineraryInput };

function path(tripId: string) {
  return `/trips/${tripId}/itinerary`;
}

export async function createItineraryItem(
  tripId: string,
  input: ItineraryInput,
) {
  const supabase = await createClient();
  const id = await createItineraryItemService(supabase, tripId, input);
  revalidatePath(path(tripId));
  return id;
}

export async function updateItineraryItem(
  id: string,
  tripId: string,
  input: ItineraryInput,
) {
  const supabase = await createClient();
  await updateItineraryItemService(supabase, id, tripId, input);
  revalidatePath(path(tripId));
}

export async function deleteItineraryItem(id: string, tripId: string) {
  const supabase = await createClient();
  await deleteItineraryItemService(supabase, id, tripId);
  revalidatePath(path(tripId));
}

export async function moveItineraryItem(
  id: string,
  tripId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  await moveItineraryItemService(supabase, id, tripId, direction);
  revalidatePath(path(tripId));
}
