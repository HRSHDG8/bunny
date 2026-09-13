"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { createFlight, updateFlight } from "@/lib/actions/flights";
import type { Flight, TripPerson } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

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
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      traveler_id: String(data.get("traveler_id") ?? "").trim(),
      airline: String(data.get("airline") ?? "").trim(),
      flight_number: String(data.get("flight_number") ?? "").trim(),
      departure_place: String(data.get("departure_place") ?? "").trim(),
      departure_code: String(data.get("departure_code") ?? "").trim(),
      departure_time: String(data.get("departure_time") ?? "").trim(),
      arrival_place: String(data.get("arrival_place") ?? "").trim(),
      arrival_code: String(data.get("arrival_code") ?? "").trim(),
      arrival_time: String(data.get("arrival_time") ?? "").trim(),
      booking_ref: String(data.get("booking_ref") ?? "").trim(),
      seat: String(data.get("seat") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
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

      <Field label="Traveler" hint="Each traveler gets their own flight legs. Pick one, or leave as whole trip.">
        <Select name="traveler_id" defaultValue={flight?.traveler_id ?? ""}>
          <option value="">Whole trip (everyone)</option>
          {people.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.full_name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Airline">
          <Input name="airline" placeholder="e.g. TAP Air Portugal" defaultValue={flight?.airline ?? ""} />
        </Field>
        <Field label="Flight no.">
          <Input name="flight_number" placeholder="e.g. TP 2340" defaultValue={flight?.flight_number ?? ""} />
        </Field>
        <Field label="Seat" hint="Optional">
          <Input name="seat" placeholder="e.g. 21A" defaultValue={flight?.seat ?? ""} />
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

      <div className="flex justify-end pt-1">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {flight ? "Save changes" : "Add flight"}
        </Button>
      </div>
    </form>
  );
}