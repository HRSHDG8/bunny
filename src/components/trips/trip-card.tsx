import Link from "next/link";
import { CalendarDays, Car, MapPin, Plane } from "lucide-react";
import { format } from "date-fns";
import type { Trip } from "@/lib/types";
import { dayCount, isTripCompleted } from "@/lib/data";
import { cn } from "@/lib/utils";

export function TripCard({
  trip,
  plannedDays,
  hasFlights,
  hasRental,
}: {
  trip: Trip;
  plannedDays: number;
  hasFlights: boolean;
  hasRental: boolean;
}) {
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  const days = dayCount(trip);
  const completed = isTripCompleted(trip);
  const upcoming = new Date(`${trip.start_date}T00:00:00`) >= new Date();
  const isSingleDay = trip.start_date === trip.end_date;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-line/70 bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
    >
      {/* destination ribbon */}
      <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-ink to-ink-soft p-5 pb-4 text-cream">
        <div>
          <p className="micro text-cream/50">
            {completed ? "Completed" : upcoming ? "Upcoming" : "Live"}
          </p>
          <h3 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight">
            {trip.destination}
          </h3>
          <p className="mt-0.5 text-[13px] text-cream/75">{trip.title}</p>
        </div>
        <span
          className={cn(
            "stamp shrink-0 bg-transparent",
            completed
              ? "text-cream/40"
              : upcoming
                ? "text-amber"
                : "text-sea-soft",
          )}
          style={{ ["--stamp-rotate" as string]: `${completed ? 4 : upcoming ? -6 : -3}deg` }}
        >
          {days} {days === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarDays className="h-4 w-4 text-sea" />
          {isSingleDay
            ? format(start, "EEE, MMM d yyyy")
            : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="micro text-muted">Day-by-day</span>
          <div className="flex h-1.5 flex-1 gap-1">
            {Array.from({ length: days }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-full flex-1 rounded-full",
                  i < plannedDays ? "bg-rust" : "bg-cream",
                )}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-rust">
            {plannedDays}/{days}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          {hasFlights ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sea-soft px-2 py-0.5 text-[11px] font-semibold text-sea-deep">
              <Plane className="h-3 w-3" /> Flight
            </span>
          ) : null}
          {hasRental ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-semibold text-amber">
              <Car className="h-3 w-3" /> Rental
            </span>
          ) : null}
          {trip.arrival_method ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-muted">
              <MapPin className="h-3 w-3" /> {trip.arrival_method}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}