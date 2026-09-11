"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { createTrip, updateTrip } from "@/lib/actions/trips";
import type { Trip } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

const arrivalOptions = [
  { value: "", label: "Not set yet" },
  { value: "flight", label: "✈️ Flight" },
  { value: "train", label: "🚆 Train" },
  { value: "drive", label: "🚗 Driving" },
  { value: "cruise", label: "🚢 Cruise" },
  { value: "other", label: "🌍 Other" },
];

export function TripForm({
  trip,
  onSaved,
}: {
  trip?: Trip;
  onSaved?: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      title: String(data.get("title") ?? ""),
      destination: String(data.get("destination") ?? ""),
      start_date: String(data.get("start_date") ?? ""),
      end_date: String(data.get("end_date") ?? ""),
      arrival_method: String(data.get("arrival_method") ?? "") as never,
      arrival_notes: String(data.get("arrival_notes") ?? ""),
    };

    setError(null);
    startTransition(async () => {
      try {
        if (trip) {
          await updateTrip(trip.id, input);
          onSaved?.();
        } else {
          await createTrip(input);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the trip.");
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Trip name">
          <Input
            name="title"
            required
            placeholder="e.g. Summer in Lisbon"
            defaultValue={trip?.title}
          />
        </Field>
        <Field label="Destination">
          <Input
            name="destination"
            required
            placeholder="e.g. Lisbon, Portugal"
            defaultValue={trip?.destination}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start date">
          <Input
            name="start_date"
            type="date"
            required
            defaultValue={trip?.start_date}
          />
        </Field>
        <Field label="End date">
          <Input
            name="end_date"
            type="date"
            required
            defaultValue={trip?.end_date}
          />
        </Field>
      </div>

      <Field label="How are you arriving?">
        <Select
          name="arrival_method"
          defaultValue={trip?.arrival_method ?? ""}
        >
          {arrivalOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Arrival notes"
        hint="Flight numbers, road trip stops, port names — anything for getting there."
      >
        <Textarea
          name="arrival_notes"
          placeholder="Optional notes about getting there…"
          defaultValue={trip?.arrival_notes ?? ""}
        />
      </Field>

      <div className="flex items-center justify-end gap-3 pt-1">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {trip ? "Save changes" : "Create trip"}
        </Button>
      </div>
    </form>
  );
}