"use client";

import React from "react";
import { CalendarDays, KeyRound } from "lucide-react";
import { createRental, updateRental } from "@/lib/actions/rentals";
import type { Rental } from "@/lib/types";
import { Button, Field, Input, Textarea } from "@/components/ui";

function toLocal(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RentalForm({
  tripId,
  rental,
  onSaved,
}: {
  tripId: string;
  rental?: Rental;
  onSaved?: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      company: String(data.get("company") ?? "").trim(),
      booking_ref: String(data.get("booking_ref") ?? "").trim(),
      car_model: String(data.get("car_model") ?? "").trim(),
      car_plate: String(data.get("car_plate") ?? "").trim(),
      pickup_place: String(data.get("pickup_place") ?? "").trim(),
      pickup_time: String(data.get("pickup_time") ?? "").trim(),
      dropoff_place: String(data.get("dropoff_place") ?? "").trim(),
      dropoff_time: String(data.get("dropoff_time") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
    };

    setError(null);
    startTransition(async () => {
      try {
        if (rental) {
          await updateRental(rental.id, tripId, input);
        } else {
          await createRental(tripId, input);
        }
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the rental.");
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rental company">
          <Input name="company" placeholder="e.g. Europcar" defaultValue={rental?.company ?? ""} />
        </Field>
        <Field label="Booking reference">
          <Input name="booking_ref" placeholder="e.g. 1QW-E54" defaultValue={rental?.booking_ref ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Car make & model">
          <Input name="car_model" placeholder="e.g. Toyota Yaris" defaultValue={rental?.car_model ?? ""} />
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber" />
              Car no / plate
            </span>
          }
          hint="Fill this in when you collect the car."
        >
          <Input
            name="car_plate"
            placeholder="e.g. AB-123-CZ"
            defaultValue={rental?.car_plate ?? ""}
            className="font-mono font-semibold tracking-widest"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-cream/30 p-4">
          <p className="micro mb-3 inline-flex items-center gap-1.5 text-sea">
            <CalendarDays className="h-3.5 w-3.5" /> Pickup
          </p>
          <div className="space-y-3">
            <Field label="Location">
              <Input name="pickup_place" placeholder="e.g. LIS Terminal 1" defaultValue={rental?.pickup_place ?? ""} />
            </Field>
            <Field label="Time">
              <Input name="pickup_time" type="datetime-local" defaultValue={toLocal(rental?.pickup_time ?? null)} />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-cream/30 p-4">
          <p className="micro mb-3 inline-flex items-center gap-1.5 text-rust">
            <CalendarDays className="h-3.5 w-3.5" /> Drop-off
          </p>
          <div className="space-y-3">
            <Field label="Location">
              <Input name="dropoff_place" placeholder="e.g. FCO Terminal 3" defaultValue={rental?.dropoff_place ?? ""} />
            </Field>
            <Field label="Time">
              <Input name="dropoff_time" type="datetime-local" defaultValue={toLocal(rental?.dropoff_time ?? null)} />
            </Field>
          </div>
        </div>
      </div>

      <Field label="Notes">
        <Textarea name="notes" placeholder="Insurance level, fuel policy, pick-up desk tips…" defaultValue={rental?.notes ?? ""} />
      </Field>

      <div className="flex justify-end pt-1">
        <Button type="submit" size="lg" disabled={pending}>
          {rental ? "Save changes" : "Add rental"}
        </Button>
      </div>
    </form>
  );
}