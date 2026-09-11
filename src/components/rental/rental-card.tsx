import { format, parseISO } from "date-fns";
import { Car, CalendarDays, Fuel, KeyRound, Pencil, Trash2 } from "lucide-react";
import type { Rental } from "@/lib/types";
import { IconButton } from "@/components/ui";

function fmtTime(dt: string | null) {
  if (!dt) return "TBD";
  return format(parseISO(dt), "EEE, MMM d · HH:mm");
}

export function RentalCard({
  rental,
  onEdit,
  onDelete,
}: {
  rental: Rental;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="ticket overflow-visible rounded-2xl">
      <div className="flex min-h-[150px] flex-col sm:flex-row">
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sea-soft text-sea-deep">
                <Car className="h-5 w-5" />
              </span>
              <div>
                <p className="micro text-muted">{rental.company || "Rental car"}</p>
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {rental.car_model || "Car"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onEdit ? (
                <IconButton label="Edit rental" onClick={onEdit}>
                  <Pencil />
                </IconButton>
              ) : null}
              {onDelete ? (
                <IconButton label="Delete rental" onClick={onDelete} className="text-rust hover:bg-rust-soft">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-ink">
              <CalendarDays className="h-4 w-4 text-sea" />
              {fmtTime(rental.pickup_time)}
              <span className="text-muted">→</span>
              {fmtTime(rental.dropoff_time)}
            </span>
            {rental.pickup_place || rental.dropoff_place ? (
              <span className="text-muted">
                {rental.pickup_place || "-"} → {rental.dropoff_place || "-"}
              </span>
            ) : null}
          </div>

          {rental.notes ? (
            <p className="mt-3 text-[13px] leading-snug text-muted">{rental.notes}</p>
          ) : null}
        </div>

        {/* Stub */}
        <div className="ticket-seam ticket-seam-stack flex w-full shrink-0 flex-col justify-center gap-4 bg-cream/40 p-4 pl-5 sm:w-40">
          <div>
            <p className="micro text-muted">Booking</p>
            <p className="mt-1 font-mono text-base font-bold tracking-wider text-ink">
              {rental.booking_ref || "-"}
            </p>
          </div>
          <div>
            <p className="micro inline-flex items-center gap-1 text-amber">
              <KeyRound className="h-3 w-3" /> Car no
            </p>
            <p
              className={
                rental.car_plate
                  ? "mt-1 inline-block rounded-lg border border-amber/40 bg-amber-soft px-2.5 py-1 font-mono text-lg font-bold tracking-[0.2em] text-amber"
                  : "mt-1 font-mono text-lg font-bold tracking-wider text-muted/50"
              }
            >
              {rental.car_plate || "_____"}
            </p>
          </div>
          <div>
            <p className="micro text-muted">Fuel</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-sea">
              <Fuel className="h-3.5 w-3.5" /> Check policy
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}