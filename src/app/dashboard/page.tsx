import { redirect } from "next/navigation";
import { Compass, Plus } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, getTrips, tripDays } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { TripCard } from "@/components/trips/trip-card";
import { SiteHeader } from "@/components/site-header";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Your trips" };

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trips = await getTrips();
  const supabase = await createClient();

  const [itineraryCounts, flightCounts, rentalCounts] = await Promise.all([
    countByTrip(supabase, "itinerary_items", trips),
    countByTrip(supabase, "flights", trips),
    countByTrip(supabase, "rentals", trips),
  ]);

  const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <SiteHeader
        email={user.email ?? undefined}
        name={user.user_metadata?.full_name ?? undefined}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="micro text-muted">{greeting}, {firstName}.</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
              Your trips
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {trips.length === 0
                ? "Nothing planned yet - let's fix that."
                : trips.length === 1
                  ? "One adventure on the board."
                  : `${trips.length} adventures on the board.`}
            </p>
          </div>
          <Link
            href="/trips/new"
            className="hidden h-11 items-center gap-2 rounded-full bg-rust px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgba(195,85,42,0.7)] transition-colors hover:bg-rust-deep sm:inline-flex"
          >
            <Plus className="h-4 w-4" /> Plan a new trip
          </Link>
        </div>

        {trips.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-8 w-8" />}
            title="Your next adventure starts here"
            body="Create a trip to add flights, a rental car, and a day-by-day itinerary."
            action={
              <Link
                href="/trips/new"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-rust px-5 text-sm font-semibold text-white hover:bg-rust-deep"
              >
                <Plus className="h-4 w-4" /> Plan a new trip
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => {
              const days = tripDays(trip).length;
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  plannedDays={Math.min(itineraryCounts.get(trip.id) ?? 0, days)}
                  hasFlights={(flightCounts.get(trip.id) ?? 0) > 0}
                  hasRental={(rentalCounts.get(trip.id) ?? 0) > 0}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function countByTrip(
  supabase: Supabase,
  table: "itinerary_items" | "flights" | "rentals",
  trips: Awaited<ReturnType<typeof getTrips>>,
) {
  if (trips.length === 0) return new Map<string, number>();
  const { data, error } = await supabase
    .from(table)
    .select("trip_id")
    .in("trip_id", trips.map((t) => t.id));
  if (error) return new Map<string, number>();
  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.trip_id, (counts.get(row.trip_id) ?? 0) + 1);
  }
  return counts;
}