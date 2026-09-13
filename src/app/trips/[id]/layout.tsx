import { format } from "date-fns";
import { CalendarDays, MapPin } from "lucide-react";
import {
  getCurrentUser,
  getTrip,
  getTripMembership,
  isTripCompleted,
  tripDays,
} from "@/lib/data";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TripTabs } from "@/components/trips/trip-tabs";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { EditTripDialog } from "@/components/trips/edit-trip-dialog";
import { InviteDialog } from "@/components/trips/invite-dialog";

export const dynamic = "force-dynamic";

export default async function TripLayout({
  children,
  params,
}: LayoutProps<"/trips/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const trip = await getTrip(id).catch(() => null);
  if (!trip) notFound();

  const isOwner = trip.user_id === user.id;
  const membership = isOwner
    ? null
    : await getTripMembership(id).catch(() => null);
  const canManage = isOwner || membership?.role === "editor";
  const completed = isTripCompleted(trip);

  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  const days = tripDays(trip);

  return (
    <>
      <SiteHeader
        email={user.email ?? undefined}
        name={user.user_metadata?.full_name ?? undefined}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-8 sm:px-6">
        {/* Trip hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-ink to-sea-deep p-7 text-cream shadow-pop sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full bg-cream/5" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-64 w-64 rounded-full border border-cream/10" />

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-cream/60">
                <MapPin className="h-4 w-4" />
                <span className="micro">{days.length} days · {days[0]?.label ?? ""}</span>
              </div>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {trip.destination}
              </h1>
              <p className="mt-1 text-[15px] text-cream/75">{trip.title}</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-cream/85">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber" />
                  <span className="font-semibold">
                    {format(start, "MMM d, yyyy")} - {format(end, "MMM d, yyyy")}
                  </span>
                </span>
                {completed ? (
                  <span className="stamp bg-transparent text-cream/40">
                    Completed
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-2xl border border-cream/15 bg-cream/5 p-1.5">
              {!completed && canManage ? <EditTripDialog trip={trip} /> : null}
              {!completed && isOwner ? (
                <>
                  <InviteDialog trip={trip} />
                  <DeleteTripButton tripId={trip.id} tripName={trip.title} />
                </>
              ) : null}
            </div>
          </div>

          {completed ? (
            <div className="relative mt-5 flex items-center gap-2 rounded-2xl border border-cream/15 bg-cream/5 px-4 py-3 text-sm text-cream/80">
              <span className="micro text-cream/50">Locked</span>
              This trip has ended and is now read-only - nothing can be edited
              or deleted.
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <TripTabs tripId={trip.id} />
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </>
  );
}