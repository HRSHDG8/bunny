"use client";

import React from "react";
import { Plane, Plus } from "lucide-react";
import { fmtDuration } from "@/lib/airports";
import type { Flight, TripPerson } from "@/lib/types";
import { deleteFlight } from "@/lib/actions/flights";
import { FlightForm } from "@/components/flights/flight-form";
import { FlightCard } from "@/components/flights/flight-card";
import { Button, EmptyState, Modal } from "@/components/ui";

/**
 * Group legs of one journey. Storage points every follower at the
 * leader's id while the leader keeps journey_id null, so the grouping
 * key is journey_id ?? own id — followers then land on the leader's
 * group. Legs are sorted by departure inside each group so layovers
 * always render chronologically.
 */
function groupJourneys(flights: Flight[]): Flight[][] {
  const groups: Flight[][] = [];
  const byKey = new Map<string, Flight[]>();
  for (const f of flights) {
    const key = f.journey_id ?? f.id;
    const g = byKey.get(key);
    if (g) g.push(f);
    else {
      const group = [f];
      byKey.set(key, group);
      groups.push(group);
    }
  }
  for (const group of groups) {
    if (group.length > 1) {
      group.sort((a, b) =>
        (a.departure_at ?? a.departure_time ?? "").localeCompare(
          b.departure_at ?? b.departure_time ?? "",
        ),
      );
    }
  }
  return groups;
}

function layoverInfo(prev: Flight, next: Flight) {
  if (!prev.arrival_at || !next.departure_at) return null;
  const ms =
    new Date(next.departure_at).getTime() -
    new Date(prev.arrival_at).getTime();
  if (ms < 0) return null;
  return {
    airport: prev.arrival_code || prev.arrival_place || "the airport",
    duration: fmtDuration(ms),
  };
}

export function FlightsManager({
  tripId,
  flights,
  people,
  locked = false,
}: {
  tripId: string;
  flights: Flight[];
  people: TripPerson[];
  locked?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Flight | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(f: Flight) {
    setEditing(f);
    setOpen(true);
  }
  function handleDelete(f: Flight) {
    if (confirm(`Delete ${f.airline ?? "this flight"} ${f.flight_number ?? ""}?`)) {
      deleteFlight(f.id, tripId).catch(() => alert("Couldn't delete the flight."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Flights</h2>
          <p className="text-sm text-muted">
            Boarding-pass style details, all in one place.
          </p>
        </div>
        {!locked ? (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add flight
          </Button>
        ) : null}
      </div>

      {flights.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-8 w-8" />}
          title="No flights yet"
          body="Add your outbound and return flights - airline, flight number, times, and booking reference."
          action={
            !locked ? (
              <Button onClick={openNew} variant="outline">
                <Plus className="h-4 w-4" /> Add your first flight
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groupJourneys(flights).map((group, groupIndex) => (
            <div
              key={group[0].id}
              className={
                groupIndex > 0
                  ? "space-y-4 border-t border-line pt-4"
                  : "space-y-4"
              }
            >
              {group.map((f, legIndex) => {
                const layover =
                  legIndex > 0
                    ? layoverInfo(group[legIndex - 1], f)
                    : null;
                return (
                  <React.Fragment key={f.id}>
                    {layover ? (
                      <p className="pl-1 text-[11px] font-semibold text-muted">
                        Layover in {layover.airport} · {layover.duration}
                      </p>
                    ) : null}
                    <FlightCard
                      flight={f}
                      people={people}
                      locked={locked}
                      onEdit={() => openEdit(f)}
                      onDelete={() => handleDelete(f)}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit flight" : "Add a flight"}
      >
        <FlightForm
          key={editing?.id ?? "new"}
          tripId={tripId}
          flight={editing ?? undefined}
          flights={flights}
          people={people}
          onSaved={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}