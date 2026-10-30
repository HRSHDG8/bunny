"use client";

import React from "react";
import { BedDouble, Plus } from "lucide-react";
import type { Stay } from "@/lib/types";
import { deleteStay } from "@/lib/actions/stays";
import { StayForm } from "@/components/stay/stay-form";
import { StayCard } from "@/components/stay/stay-card";
import { Button, EmptyState, Modal } from "@/components/ui";

export function StaysManager({
  tripId,
  stays,
  locked = false,
}: {
  tripId: string;
  stays: Stay[];
  locked?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Stay | null>(null);

  function handleDelete(stay: Stay) {
    if (confirm(`Delete the ${stay.name ?? "stay"} booking?`)) {
      deleteStay(stay.id, tripId).catch(() => alert("Couldn't delete the stay."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Stays</h2>
          <p className="text-sm text-muted">
            Hotels, apartments and guesthouses - check-in to check-out.
          </p>
        </div>
        {!locked ? (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add stay
          </Button>
        ) : null}
      </div>

      {stays.length === 0 ? (
        <EmptyState
          icon={<BedDouble className="h-8 w-8" />}
          title="No stays yet"
          body="Save where you're sleeping, the check-in times and the booking reference - then link it to itinerary days."
          action={
            !locked ? (
              <Button variant="outline" onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="h-4 w-4" /> Add a stay
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {stays.map((stay) => (
            <StayCard
              key={stay.id}
              stay={stay}
              locked={locked}
              onEdit={() => { setEditing(stay); setOpen(true); }}
              onDelete={() => handleDelete(stay)}
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit stay" : "Add a stay"}
      >
        <StayForm
          tripId={tripId}
          stay={editing ?? undefined}
          onSaved={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}
