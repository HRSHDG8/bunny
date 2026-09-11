"use client";

import React from "react";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import type { ItineraryItem, PlaceResult } from "@/lib/types";
import { createItineraryItem, updateItineraryItem } from "@/lib/actions/itinerary";
import { PlaceSearch } from "@/components/place-search";
import { Button, Field, Input, Textarea } from "@/components/ui";

export function ItineraryItemForm({
  tripId,
  dayNumber,
  item,
  onSaved,
}: {
  tripId: string;
  dayNumber: number;
  item?: ItineraryItem;
  onSaved?: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [place, setPlace] = React.useState<PlaceResult | null>(
    item?.place_name
      ? {
          name: item.place_name,
          address: "",
          lat: item.lat ?? 0,
          lon: item.lng ?? 0,
        }
      : null,
  );

  function handleSelectPlace(p: PlaceResult) {
    setPlace(p);
    setError(null);
  }

  function clearPlace() {
    setPlace(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim() || place?.name?.trim() || "";
    const input = {
      day_number: dayNumber,
      title,
      place_name: place?.name ?? "",
      lat: place ? place.lat : null,
      lng: place ? place.lon : null,
      start_time: String(data.get("start_time") ?? ""),
      end_time: String(data.get("end_time") ?? ""),
      notes: String(data.get("notes") ?? ""),
    };

    setError(null);
    startTransition(async () => {
      try {
        if (item) {
          await updateItineraryItem(item.id, tripId, input);
        } else {
          await createItineraryItem(tripId, input);
        }
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the activity.");
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

      <Field
        label="Find a place"
        hint="Optional - search picks up the name and coordinates automatically."
      >
        <PlaceSearch onSelect={handleSelectPlace} defaultValue={item?.place_name ?? ""} />
      </Field>

      {place ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sea/25 bg-sea-soft px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sea text-white">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sea-deep">{place.name}</p>
              <p className="truncate text-xs text-sea-deep/70">
                {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
                {place.address ? ` · ${place.address}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearPlace}
            aria-label="Remove place"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sea-deep/60 hover:bg-sea-soft hover:text-sea-deep"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <Field label="Activity name">
        <Input
          name="title"
          placeholder="e.g. Sunset at Miradouro da Graça"
          defaultValue={item?.title}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start">
          <Input name="start_time" type="time" defaultValue={item?.start_time?.slice(0, 5) ?? ""} />
        </Field>
        <Field label="End">
          <Input name="end_time" type="time" defaultValue={item?.end_time?.slice(0, 5) ?? ""} />
        </Field>
      </div>

      <Field label="Notes" hint="Rough times, prices, tips, what to bring…">
        <Textarea
          name="notes"
          placeholder="Jot anything down for this spot."
          defaultValue={item?.notes ?? ""}
        />
      </Field>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
          <LocateFixed className="h-3.5 w-3.5" />
          {place ? "Pinned to the map" : "No pin attached"}
        </p>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {item ? "Save changes" : "Add to Day " + dayNumber}
        </Button>
      </div>
    </form>
  );
}