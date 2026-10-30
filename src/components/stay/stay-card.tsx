import { format, parseISO } from "date-fns";
import { BedDouble, CalendarDays, MapPin, Pencil, Trash2 } from "lucide-react";
import type { Stay } from "@/lib/types";
import { Badge, IconButton } from "@/components/ui";

function fmt(dt: string | null) {
  if (!dt) return "TBD";
  return format(parseISO(dt), "EEE, MMM d · HH:mm");
}

export function StayCard({
  stay,
  locked = false,
  onEdit,
  onDelete,
}: {
  stay: Stay;
  locked?: boolean;
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
                <BedDouble className="h-5 w-5" />
              </span>
              <div>
                <p className="micro text-muted">Stay</p>
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {stay.name || "Accommodation"}
                </p>
                {stay.place_name ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
                    <MapPin className="h-3.5 w-3.5 text-rust" />
                    {stay.place_name}
                    {stay.lat != null && stay.lng != null ? (
                      <Badge tone="sea">pinned</Badge>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!locked && onEdit ? (
                <IconButton label="Edit stay" onClick={onEdit}>
                  <Pencil />
                </IconButton>
              ) : null}
              {!locked && onDelete ? (
                <IconButton label="Delete stay" onClick={onDelete} className="text-rust hover:bg-rust-soft">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-ink">
              <CalendarDays className="h-4 w-4 text-sea" />
              {fmt(stay.check_in)}
              <span className="text-muted">→</span>
              {fmt(stay.check_out)}
            </span>
            {stay.address ? <span className="text-muted">{stay.address}</span> : null}
          </div>

          {stay.notes ? (
            <p className="mt-3 text-[13px] leading-snug text-muted">{stay.notes}</p>
          ) : null}
        </div>

        <div className="ticket-seam ticket-seam-stack flex w-full shrink-0 flex-col justify-center gap-4 bg-cream/40 p-4 pl-5 sm:w-40">
          <div>
            <p className="micro text-muted">Booking</p>
            <p className="mt-1 font-mono text-base font-bold tracking-wider text-ink">
              {stay.booking_ref || "-"}
            </p>
          </div>
          <div>
            <p className="micro text-muted">Check-in</p>
            <p className="mt-0.5 text-[13px] font-semibold text-sea">
              {stay.check_in ? format(parseISO(stay.check_in), "MMM d, HH:mm") : "TBD"}
            </p>
          </div>
          <div>
            <p className="micro text-muted">Check-out</p>
            <p className="mt-0.5 text-[13px] font-semibold text-rust">
              {stay.check_out ? format(parseISO(stay.check_out), "MMM d, HH:mm") : "TBD"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
