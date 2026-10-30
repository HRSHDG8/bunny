"use client";

import React from "react";
import { BedDouble, CalendarDays, MapPin, X } from "lucide-react";
import { createStay, updateStay } from "@/lib/actions/stays";
import type { PlaceResult, Stay } from "@/lib/types";
import { PlaceSearch } from "@/components/place-search";
import { Button, Field, Input, Textarea } from "@/components/ui";

function toLocal(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StayForm({
  tripId,
  stay,
  onSaved,
}: {
  tripId: string;
  stay?: Stay;
  onSaved?: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [place, setPlace] = React.useState<PlaceResult | null>(
    stay?.place_name
      ? {
          name: stay.place_name,
          address: stay.address ?? "",
          lat: stay.lat ?? 0,
          lon: stay.lng ?? 0,
        }
      : null,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      name: String(data.get("name") ?? "").trim(),
      place_name: place?.name ?? "",
      address: place?.address ?? "",
      lat: place ? place.lat : null,
      lng: place ? place.lon : null,
      check_in: String(data.get("check_in") ?? "").trim(),
      check_out: String(data.get("check_out") ?? "").trim(),
      booking_ref: String(data.get("booking_ref") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
    };

    setError(null);
    startTransition(async () => {
      try {
        if (stay) {
          await updateStay(stay.id, tripId, input);
        } else {
          await createStay(tripId, input);
        }
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the stay.");
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
        <Field label="Stay name">
          <Input
            name="name"
            placeholder="e.g. Casa do Bairro"
            defaultValue={stay?.name ?? ""}
          />
        </Field>
        <Field label="Booking reference">
          <Input
            name="booking_ref"
            placeholder="e.g. 4821-XZ"
            defaultValue={stay?.booking_ref ?? ""}
          />
        </Field>
      </div>

      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-rust" />
            Find the place
          </span>
        }
        hint="Optional - search picks up the name, address and coordinates."
      >
        <PlaceSearch
          onSelect={(p) => {
            setPlace(p);
            setError(null);
          }}
          defaultValue={stay?.place_name ?? ""}
        />
      </Field>

      {place ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sea/25 bg-sea-soft px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sea-solid text-white">
              <BedDouble className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sea-deep">{place.name}</p>
              <p className="truncate text-xs text-sea-deep/70">
                {place.address || `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPlace(null)}
            aria-label="Remove place"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sea-deep/60 hover:bg-sea-soft hover:text-sea-deep"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-cream/30 p-4">
          <p className="micro mb-3 inline-flex items-center gap-1.5 text-sea">
            <CalendarDays className="h-3.5 w-3.5" /> Check-in
          </p>
          <Field label="Date & time">
            <Input name="check_in" type="datetime-local" defaultValue={toLocal(stay?.check_in ?? null)} />
          </Field>
        </div>

        <div className="rounded-2xl border border-line bg-cream/30 p-4">
          <p className="micro mb-3 inline-flex items-center gap-1.5 text-rust">
            <CalendarDays className="h-3.5 w-3.5" /> Check-out
          </p>
          <Field label="Date & time">
            <Input name="check_out" type="datetime-local" defaultValue={toLocal(stay?.check_out ?? null)} />
          </Field>
        </div>
      </div>

      <Field label="Notes">
        <Textarea
          name="notes"
          placeholder="Breakfast times, door code, parking, what's nearby…"
          defaultValue={stay?.notes ?? ""}
        />
      </Field>

      <div className="flex justify-end pt-1">
        <Button type="submit" size="lg" disabled={pending}>
          {stay ? "Save changes" : "Add stay"}
        </Button>
      </div>
    </form>
  );
}
