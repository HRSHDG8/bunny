"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/supabase/errors";
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

const ACTIVE_TRIP_LIMIT = 5;
const QUOTA_MSG =
  "You can have up to 5 active trips at once. A trip frees its slot once its end date passes.";
const LOCKED_MSG =
  "This trip has been completed and is now locked - it can't be changed.";

function lockError(error: PostgrestError, fallback: string) {
  if (/up to 5 active trips/i.test(error.message)) return new Error(QUOTA_MSG);
  if (/completed and is now locked/i.test(error.message))
    return new Error(LOCKED_MSG);
  if (/already ended and can't be joined/i.test(error.message))
    return new Error("This trip has already ended and can't be joined.");
  return apiError(fallback, error);
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

  const today = new Date().toISOString().slice(0, 10);
  const { count, error: countError } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("end_date", today);
  if (!countError && (count ?? 0) >= ACTIVE_TRIP_LIMIT)
    throw new Error(QUOTA_MSG);

  const shareToken = crypto.randomUUID();
  const { error } = await supabase.from("trips").insert({
    title: input.title.trim(),
    destination: input.destination.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    arrival_method: input.arrival_method || null,
    arrival_notes: input.arrival_notes?.trim() || null,
    user_id: user.id,
    share_token: shareToken,
  });
  if (error) throw lockError(error, "Couldn't create the trip. Please try again.");

  const { data: trip, error: readError } = await supabase
    .from("trips")
    .select("id")
    .eq("share_token", shareToken)
    .single();
  if (readError || !trip)
    throw apiError(
      "Couldn't create the trip. Please try again.",
      readError ?? null,
    );

  revalidatePath("/dashboard");
  redirect(tripPath(trip.id));
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
  if (error) throw lockError(error, "Couldn't save the trip.");
  revalidatePath(tripPath(id));
  revalidatePath("/dashboard");
}

export async function deleteTrip(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw lockError(error, "Couldn't delete the trip.");
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
    if (error) throw lockError(error, "Couldn't turn on sharing for this trip.");
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
  if (error) throw lockError(error, "Couldn't turn off sharing for this trip.");
  revalidatePath(tripPath(id));
}

export async function setTripSharingEmails(id: string, raw: string) {
  await requireTripOwner(id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ share_emails: parseShareEmails(raw) })
    .eq("id", id);
  if (error) throw lockError(error, "Couldn't save the guest list for this trip.");
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
    if (/already ended/i.test(hint))
      throw new Error("This trip has already ended and can't be joined.");
    throw apiError("This invite link is invalid or has been revoked.", error);
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/dashboard");
  redirect(`/trips/${tripId}`);
}