import { eachDayOfInterval, format } from "date-fns";
import { createClient, requireUser } from "@/lib/supabase/server";
import type {
  Flight,
  ItineraryItem,
  Rental,
  Trip,
  TripMember,
  TripPreview,
} from "@/lib/types";

export class NotFoundError extends Error {}

export async function getCurrentUser() {
  return requireUser();
}

export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTrip(id: string): Promise<Trip> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new NotFoundError("Not authorized");

  // Row-level security limits this to the owner and invited members.
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) throw new NotFoundError("Trip not found");
  return data;
}

export async function getTripMembership(
  tripId: string,
): Promise<TripMember | null> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("trip_members")
    .select("*")
    .eq("trip_id", tripId)
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getTripPreview(token: string): Promise<TripPreview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trip_for_invite", {
    p_token: token,
  });
  if (error || !data || data.length === 0)
    throw new NotFoundError("Invite not found");
  return data[0];
}

export async function getFlights(tripId: string): Promise<Flight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flights")
    .select("*")
    .eq("trip_id", tripId)
    .order("departure_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRentals(tripId: string): Promise<Rental[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("trip_id", tripId)
    .order("pickup_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getItinerary(tripId: string): Promise<ItineraryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export function tripDays(trip: Pick<Trip, "start_date" | "end_date">) {
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  return eachDayOfInterval({ start, end }).map((date, i) => ({
    dayNumber: i + 1,
    date: format(date, "yyyy-MM-dd"),
    label: format(date, "EEE, MMM d"),
  }));
}

export function dayCount(trip: Pick<Trip, "start_date" | "end_date">) {
  return tripDays(trip).length;
}