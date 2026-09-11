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

async function requireTripOwner(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!trip || trip.user_id !== user.id)
    throw new Error("Only the trip owner can do that.");
}

function parseShareEmails(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
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
      share_token: crypto.randomUUID(),
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

export async function enableTripSharing(id: string) {
  await requireTripOwner(id);
  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select("share_token")
    .eq("id", id)
    .single();

  if (!trip?.share_token) {
    const { error } = await supabase
      .from("trips")
      .update({ share_token: crypto.randomUUID() })
      .eq("id", id);
    if (error) throw new Error("Couldn't turn on sharing for this trip.");
  }
  revalidatePath(tripPath(id));
}

export async function revokeTripSharing(id: string) {
  await requireTripOwner(id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ share_token: null, share_emails: [] })
    .eq("id", id);
  if (error) throw new Error("Couldn't turn off sharing for this trip.");
  revalidatePath(tripPath(id));
}

export async function setTripSharingEmails(id: string, raw: string) {
  await requireTripOwner(id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ share_emails: parseShareEmails(raw) })
    .eq("id", id);
  if (error) throw new Error("Couldn't save the guest list for this trip.");
  revalidatePath(tripPath(id));
}

export async function joinTripByToken(token: string) {
  if (!token) throw new Error("This invite link is missing.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tripId, error } = await supabase.rpc("join_trip", {
    p_token: token,
  });
  if (error) {
    const hint = error.message;
    if (/invite link is missing/i.test(hint))
      throw new Error("This invite link is missing.");
    if (/reserved for specific people/i.test(hint))
      throw new Error(
        "This invite is for specific people only, and your email isn't on the list.",
      );
    if (/Sign in to join/i.test(hint))
      throw new Error("Sign in to join this trip.");
    throw new Error("This invite link is invalid or has been revoked.");
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/dashboard");
  redirect(`/trips/${tripId}`);
}