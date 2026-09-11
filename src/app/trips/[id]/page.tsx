import Link from "next/link";
import { ArrowRight, Car, MapPin, Plane, Train, Ship, Footprints } from "lucide-react";
import { getFlights, getItinerary, getRentals, getTrip, tripDays } from "@/lib/data";
import { FlightCard } from "@/components/flights/flight-card";
import { RentalCard } from "@/components/rental/rental-card";
import { Badge, Card, EmptyState } from "@/components/ui";

export const metadata = { title: "Trip overview" };

const arrivalMeta: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  flight: { label: "Flying in", icon: <Plane className="h-4 w-4" /> },
  train: { label: "By train", icon: <Train className="h-4 w-4" /> },
  drive: { label: "Driving", icon: <Car className="h-4 w-4" /> },
  cruise: { label: "By cruise", icon: <Ship className="h-4 w-4" /> },
  other: { label: "Arriving", icon: <Footprints className="h-4 w-4" /> },
};

export default async function TripOverviewPage(
  props: PageProps<"/trips/[id]">,
) {
  const { id } = await props.params;
  const [trip, flights, rentals, items] = await Promise.all([
    getTrip(id),
    getFlights(id),
    getRentals(id),
    getItinerary(id),
  ]);

  const days = tripDays(trip);
  const plannedDays = new Set(items.map((i) => i.day_number)).size;
  const arrival = trip.arrival_method ? arrivalMeta[trip.arrival_method] : null;

  return (
    <div className="space-y-6">
      {/* Arrival + progress strip */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <p className="micro text-muted">How you get there</p>
          <div className="mt-2 flex items-center gap-3">
            {arrival ? (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rust-soft text-rust-deep">
                  {arrival.icon}
                </span>
                <span className="font-display text-xl font-semibold">
                  {arrival.label}
                </span>
              </>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-muted">
                  <MapPin className="h-5 w-5" />
                </span>
                <p className="font-display text-lg font-semibold">Not set yet</p>
              </>
            )}
          </div>
          {trip.arrival_notes ? (
            <p className="mt-4 rounded-xl bg-cream/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
              {trip.arrival_notes}
            </p>
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="micro text-muted">Itinerary progress</p>
            <Badge tone={plannedDays === days.length ? "rust" : "amber"}>
              {plannedDays}/{days.length} days planned
            </Badge>
          </div>
          <div className="mt-4 flex gap-1.5">
            {days.map((d) => (
              <Link
                key={d.dayNumber}
                href={`/trips/${trip.id}/itinerary`}
                className="group flex-1"
              >
                <span
                  className={`block h-2.5 w-full rounded-full transition-transform group-hover:scale-y-150 ${
                    plannedDays >= d.dayNumber ? "bg-rust" : "bg-cream"
                  }`}
                />
                <span className="mt-1 block text-center text-[10px] font-semibold text-muted">
                  {d.dayNumber}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href={`/trips/${trip.id}/itinerary`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sea hover:text-sea-deep"
          >
            Open itinerary <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      {/* Flights */}
      <SectionHeading
        title="Flights"
        link={`/trips/${trip.id}/flights`}
        linkLabel={flights.length ? "Manage" : "Add flights"}
      />
      {flights.length === 0 ? (
        <EmptyState
          title="No flights yet"
          body="Add airlines, flight numbers and times when they're booked."
          action={<GoLink href={`/trips/${trip.id}/flights`} label="Add a flight" />}
        />
      ) : (
        <div className="space-y-4">
          {flights.slice(0, 2).map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
        </div>
      )}

      {/* Rental */}
      <SectionHeading
        title="Rental car"
        link={`/trips/${trip.id}/rental`}
        linkLabel={rentals.length ? "Manage" : "Add rental"}
      />
      {rentals.length === 0 ? (
        <EmptyState
          title="No rental car yet"
          body="Keep booking details here — and the plate number when you collect it."
          action={<GoLink href={`/trips/${trip.id}/rental`} label="Add a rental" />}
        />
      ) : (
        <div className="space-y-4">
          {rentals.slice(0, 1).map((r) => (
            <RentalCard key={r.id} rental={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  link,
  linkLabel,
}: {
  title: string;
  link: string;
  linkLabel: string;
}) {
  return (
    <div className="mt-2 flex items-center justify-between pb-1 pt-4">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <Link
        href={link}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-sea hover:text-sea-deep"
      >
        {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function GoLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-[13px] font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-cream"
    >
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}