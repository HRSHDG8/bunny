"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createTrip as createTripService,
  deleteTrip as deleteTripService,
  enableTripSharing as enableTripSharingService,
  revokeTripSharing as revokeTripSharingService,
  setTripSharingEmails as setTripSharingEmailsService,
  updateTrip as updateTripService,
  type TripInput,
} from "@/lib/services/trips";
import { apiError } from "@/lib/supabase/errors";

export type { TripInput };

function tripPath(id: string) {
  return `/trips/${id}`;
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createTrip(input: TripInput) {
  const { supabase, userId } = await requireUserId();
  const tripId = await createTripService(supabase, userId, input);
  revalidatePath("/dashboard");
  redirect(tripPath(tripId));
}

export async function updateTrip(id: string, input: TripInput) {
  const { supabase } = await requireUserId();
  await updateTripService(supabase, id, input);
  revalidatePath(tripPath(id));
  revalidatePath("/dashboard");
}

export async function deleteTrip(id: string) {
  const { supabase } = await requireUserId();
  await deleteTripService(supabase, id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function enableTripSharing(id: string) {
  const { supabase, userId } = await requireUserId();
  await enableTripSharingService(supabase, id, userId);
  revalidatePath(tripPath(id));
}

export async function revokeTripSharing(id: string) {
  const { supabase, userId } = await requireUserId();
  await revokeTripSharingService(supabase, id, userId);
  revalidatePath(tripPath(id));
}

export async function setTripSharingEmails(id: string, raw: string) {
  const { supabase, userId } = await requireUserId();
  await setTripSharingEmailsService(supabase, id, userId, raw);
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
