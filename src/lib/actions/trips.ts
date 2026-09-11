"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ArrivalMethod } from "@/lib/types";

export interface TripInput {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  arrival_method: ArrivalMethod | "";
  arrival_notes?: string;
}

function validate(input: TripInput) {
  if (!input.title.trim()) throw new Error("Give your trip a name.");
  if (!input.destination.trim()) throw new Error("Where are you headed?");
  if (!input.start_date || !input.end_date)
    throw new Error("Pick start and end dates.");
  if (input.start_date > input.end_date)
    throw new Error("The end date can't be before the start date.");
}

function tripPath(id: string) {
  return `/trips/${id}`;
}

export async function createTrip(input: TripInput) {
  validate(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("trips")
    .insert({
      title: input.title.trim(),
      destination: input.destination.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      arrival_method: input.arrival_method || null,
      arrival_notes: input.arrival_notes?.trim() || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw new Error("Couldn't create the trip. Please try again.");
  revalidatePath("/dashboard");
  redirect(tripPath(data.id));
}

export async function updateTrip(id: string, input: TripInput) {
  validate(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({
      title: input.title.trim(),
      destination: input.destination.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      arrival_method: input.arrival_method || null,
      arrival_notes: input.arrival_notes?.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error("Couldn't save the trip.");
  revalidatePath(tripPath(id));
  revalidatePath("/dashboard");
}

export async function deleteTrip(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the trip.");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}