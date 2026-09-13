import { format, parseISO } from "date-fns";
import { Pencil, Plane, Trash2 } from "lucide-react";
import type { Flight, TripPerson } from "@/lib/types";
import { Badge, IconButton } from "@/components/ui";

function fmtTime(dt: string | null) {
  if (!dt) return "TBD";
  return format(parseISO(dt), "EEE, MMM d · HH:mm");
}

export function FlightCard({
  flight,
  people,
  locked = false,
  onEdit,
  onDelete,
}: {
  flight: Flight;
  people: TripPerson[];
  locked?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const dep = flight.departure_code || flight.departure_place?.slice(0, 6) || "-";
  const arr = flight.arrival_code || flight.arrival_place?.slice(0, 6) || "-";
  const traveler = flight.traveler_id
    ? people.find((p) => p.user_id === flight.traveler_id)
    : null;

  return (
    <article className="ticket overflow-visible rounded-2xl">
      <div className="flex min-h-[148px] flex-col sm:flex-row">
        {/* Main ticket */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="micro text-muted">{flight.airline || "Flight"}</p>
              <p className="mt-0.5 font-display text-2xl font-semibold tracking-tight text-ink">
                {flight.flight_number || "-"}
              </p>
              {flight.traveler_id ? (
                <Badge tone="sea" className="mt-1">
                  {traveler?.full_name ?? "Traveler"}
                </Badge>
              ) : (
                <Badge tone="amber" className="mt-1">
                  Whole trip
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!locked && onEdit ? (
                <IconButton label="Edit flight" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
              {!locked && onDelete ? (
                <IconButton label="Delete flight" onClick={onDelete} className="text-rust hover:bg-rust-soft">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1">
              <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">{dep}</p>
              <p className="text-[11px] font-medium text-muted">{flight.departure_place}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-sea">{fmtTime(flight.departure_time)}</p>
            </div>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="h-px flex-1 border-t border-dashed border-line-strong" />
              <Plane className="h-4 w-4 rotate-90 text-rust" />
              <span className="h-px flex-1 border-t border-dashed border-line-strong" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">{arr}</p>
              <p className="text-[11px] font-medium text-muted">{flight.arrival_place}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-rust">{fmtTime(flight.arrival_time)}</p>
            </div>
          </div>
        </div>

        {/* Stub */}
        <div className="ticket-seam ticket-seam-stack w-full shrink-0 bg-cream/40 p-4 pl-5 sm:w-36">
          <p className="micro text-muted">Booking</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-wider text-ink">
            {flight.booking_ref || "-"}
          </p>
          <p className="micro mt-4 text-muted">Seat</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-wider text-ink">
            {flight.seat || "-"}
          </p>
          {flight.notes ? (
            <>
              <p className="micro mt-4 text-muted">Notes</p>
              <p className="mt-1 text-[12px] leading-snug text-ink-soft">{flight.notes}</p>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}