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
 * Group consecutive flights sharing a journey_id into one block. Flights
 * arrive pre-sorted by departure; a group is just its members in order.
 */
function groupJourneys(flights: Flight[]): Flight[][] {
  const groups: Flight[][] = [];
  const byJourney = new Map<string, Flight[]>();
  for (const f of flights) {
    if (!f.journey_id) {
      groups.push([f]);
      continue;
    }
    const g = byJourney.get(f.journey_id);
    if (g) g.push(f);
    else {
      const group = [f];
      byJourney.set(f.journey_id, group);
      groups.push(group);
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
          {groupJourneys(flights).map((group) => (
            <div key={group[0].id} className="space-y-4">
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