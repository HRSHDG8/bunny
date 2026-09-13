"use client";

import React from "react";
import { Loader2, UsersRound } from "lucide-react";
import { createFlight, updateFlight } from "@/lib/actions/flights";
import type { Flight, TripPerson } from "@/lib/types";
import { Button, Field, Input, Textarea } from "@/components/ui";

function toLocal(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FlightForm({
  tripId,
  flight,
  people,
  onSaved,
}: {
  tripId: string;
  flight?: Flight;
  people: TripPerson[];
  onSaved?: () => void;
}) {
  const initial = React.useMemo(() => {
    const set = new Map<string, string>();
    for (const p of flight?.flight_passengers ?? []) {
      if (p.user_id) {
        set.set(p.user_id, p.seat ?? "");
      }
    }
    return set;
  }, [flight]);

  const [seats, setSeats] = React.useState<Map<string, string>>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function toggle(userId: string) {
    setSeats((prev) => {
      const next = new Map(prev);
      if (next.has(userId)) next.delete(userId);
      else next.set(userId, "");
      return next;
    });
  }

  function seatFor(userId: string) {
    return seats.get(userId) ?? "";
  }

  function setSeat(userId: string, value: string) {
    setSeats((prev) => {
      const next = new Map(prev);
      next.set(userId, value);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const passengers = [...seats.keys()]
      .filter((id) => people.some((p) => p.user_id === id))
      .map((id) => ({
        user_id: id,
        seat: String(data.get(`seat_${id}`) ?? "").trim(),
      }));

    const input = {
      airline: String(data.get("airline") ?? "").trim(),
      flight_number: String(data.get("flight_number") ?? "").trim(),
      departure_place: String(data.get("departure_place") ?? "").trim(),
      departure_code: String(data.get("departure_code") ?? "").trim(),
      departure_time: String(data.get("departure_time") ?? "").trim(),
      arrival_place: String(data.get("arrival_place") ?? "").trim(),
      arrival_code: String(data.get("arrival_code") ?? "").trim(),
      arrival_time: String(data.get("arrival_time") ?? "").trim(),
      booking_ref: String(data.get("booking_ref") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
      passengers,
    };

    setError(null);
    startTransition(async () => {
      try {
        if (flight) {
          await updateFlight(flight.id, tripId, input);
        } else {
          await createFlight(tripId, input);
        }
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the flight.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-rust/25 bg-rust-soft px-4 py-3 text-sm font-medium text-rust-deep">
          {error}
        </div>
      ) : null}

      <Field label="Who's on this flight?" hint="Tick the people on board and add each one's seat. Leave all unchecked for the whole trip. Someone can ride multiple flights, like an outbound and return leg.">
        <div className="overflow-hidden rounded-xl border border-line bg-cream/30">
          {people.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">
              No other people on this trip yet - share the invite link to add them.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {people.map((p) => {
                const checked = seats.has(p.user_id);
                return (
                  <li key={p.user_id} className="px-4 py-2.5">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p.user_id)}
                        className="h-4 w-4 shrink-0 accent-rust"
                      />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-ink">
                          {p.full_name}
                          {!p.is_owner ? (
                            <span className="ml-1 font-normal text-muted">· shared</span>
                          ) : (
                            <span className="ml-1 font-normal text-muted">· owner</span>
                          )}
                        </span>
                      </span>
                      {checked ? (
                        <Input
                          name={`seat_${p.user_id}`}
                          placeholder="Seat (e.g. 21A)"
                          value={seatFor(p.user_id)}
                          onChange={(e) => setSeat(p.user_id, e.target.value)}
                          className="w-32 py-1.5 text-sm"
                        />
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Airline">
          <Input name="airline" placeholder="e.g. TAP Air Portugal" defaultValue={flight?.airline ?? ""} />
        </Field>
        <Field label="Flight no.">
          <Input name="flight_number" placeholder="e.g. TP 2340" defaultValue={flight?.flight_number ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-cream/30 p-4">
          <p className="micro mb-3 text-sea">Departure</p>
          <div className="space-y-3">
            <Field label="Airport / city">
              <Input name="departure_place" placeholder="e.g. Lisbon Airport (LIS)" defaultValue={flight?.departure_place ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code">
                <Input name="departure_code" placeholder="LIS" maxLength={4} defaultValue={flight?.departure_code ?? ""} />
              </Field>
              <Field label="Time">
                <Input name="departure_time" type="datetime-local" defaultValue={toLocal(flight?.departure_time ?? null)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-cream/30 p-4">
          <p className="micro mb-3 text-rust">Arrival</p>
          <div className="space-y-3">
            <Field label="Airport / city">
              <Input name="arrival_place" placeholder="e.g. Rome Fiumicino (FCO)" defaultValue={flight?.arrival_place ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code">
                <Input name="arrival_code" placeholder="FCO" maxLength={4} defaultValue={flight?.arrival_code ?? ""} />
              </Field>
              <Field label="Time">
                <Input name="arrival_time" type="datetime-local" defaultValue={toLocal(flight?.arrival_time ?? null)} />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Booking reference" hint="Confirmation code">
          <Input name="booking_ref" placeholder="e.g. 8K2M3P" defaultValue={flight?.booking_ref ?? ""} />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea name="notes" placeholder="Gate tips, baggage, lounge access…" defaultValue={flight?.notes ?? ""} />
      </Field>

      <div className="flex items-center justify-end gap-3 pt-1">
        {people.length > 0 ? (
          <span className="micro flex items-center gap-1.5 text-muted">
            <UsersRound className="h-3.5 w-3.5" /> {seats.size} of {people.length} boarding
          </span>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {flight ? "Save changes" : "Add flight"}
        </Button>
      </div>
    </form>
  );
}