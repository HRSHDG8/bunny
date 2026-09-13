"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/supabase/errors";

export interface ItineraryInput {
  day_number: number;
  title: string;
  place_name: string;
  lat: number | null;
  lng: number | null;
  start_time: string;
  end_time: string;
  notes: string;
}

function path(tripId: string) {
  return `/trips/${tripId}/itinerary`;
}

function validateTitle(title: string) {
  if (!title.trim()) throw new Error("Give the activity a name.");
}

export async function createItineraryItem(
  tripId: string,
  input: ItineraryInput,
) {
  validateTitle(input.title);
  const supabase = await createClient();

  const { data: last, error: lastErr } = await supabase
    .from("itinerary_items")
    .select("sort_order")
    .eq("trip_id", tripId)
    .eq("day_number", input.day_number)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw apiError("Couldn't plan this activity.", lastErr);

  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("itinerary_items")
    .insert({
      id,
      trip_id: tripId,
      day_number: input.day_number,
      title: input.title.trim(),
      place_name: input.place_name.trim() || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      notes: input.notes.trim() || null,
      sort_order: (last?.sort_order ?? 0) + 1,
    });
  if (error) throw apiError("Couldn't add the activity.", error);
  revalidatePath(path(tripId));
  return id;
}

export async function updateItineraryItem(
  id: string,
  tripId: string,
  input: ItineraryInput,
) {
  validateTitle(input.title);
  const supabase = await createClient();
  const { error } = await supabase
    .from("itinerary_items")
    .update({
      day_number: input.day_number,
      title: input.title.trim(),
      place_name: input.place_name.trim() || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);
  if (error) throw apiError("Couldn't save the activity.", error);
  revalidatePath(path(tripId));
}

export async function deleteItineraryItem(id: string, tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
  if (error) throw apiError("Couldn't delete the activity.", error);
  revalidatePath(path(tripId));
}

export async function moveItineraryItem(
  id: string,
  tripId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();

  const { data: current, error: curErr } = await supabase
    .from("itinerary_items")
    .select("day_number, sort_order")
    .eq("id", id)
    .single();
  if (curErr || !current) throw apiError("Couldn't reorder the activity.", curErr);

  const { data: all, error: allErr } = await supabase
    .from("itinerary_items")
    .select("id, sort_order")
    .eq("trip_id", tripId)
    .eq("day_number", current.day_number)
    .order("sort_order", { ascending: true });
  if (allErr) throw apiError("Couldn't reorder the activity.", allErr);

  const index = all.findIndex((i) => i.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= all.length) return;

  const neighbor = all[target];
  const a = supabase
    .from("itinerary_items")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", id);
  const b = supabase
    .from("itinerary_items")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);
  const results = await Promise.all([a, b]);
  const reorderErr = results.find((r) => r.error)?.error;
  if (reorderErr) throw apiError("Couldn't reorder the activity.", reorderErr);
  revalidatePath(path(tripId));
}