"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  if (lastErr) throw new Error("Couldn't plan this activity.");

  const { data, error } = await supabase
    .from("itinerary_items")
    .insert({
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
    })
    .select()
    .single();
  if (error) throw new Error("Couldn't add the activity.");
  revalidatePath(path(tripId));
  return data.id;
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
  if (error) throw new Error("Couldn't save the activity.");
  revalidatePath(path(tripId));
}

export async function deleteItineraryItem(id: string, tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the activity.");
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
  if (curErr || !current) throw new Error("Couldn't reorder the activity.");

  const { data: all, error: allErr } = await supabase
    .from("itinerary_items")
    .select("id, sort_order")
    .eq("trip_id", tripId)
    .eq("day_number", current.day_number)
    .order("sort_order", { ascending: true });
  if (allErr) throw new Error("Couldn't reorder the activity.");

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
  if (results.some((r) => r.error)) throw new Error("Couldn't reorder the activity.");
  revalidatePath(path(tripId));
}