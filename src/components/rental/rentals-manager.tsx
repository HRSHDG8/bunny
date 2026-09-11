"use client";

import React from "react";
import { Car, Plus } from "lucide-react";
import type { Rental } from "@/lib/types";
import { deleteRental } from "@/lib/actions/rentals";
import { RentalForm } from "@/components/rental/rental-form";
import { RentalCard } from "@/components/rental/rental-card";
import { Button, EmptyState, Modal } from "@/components/ui";

export function RentalsManager({
  tripId,
  rentals,
}: {
  tripId: string;
  rentals: Rental[];
}) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Rental | null>(null);

  function handleDelete(r: Rental) {
    if (confirm(`Delete the ${r.company ?? "rental"} booking?`)) {
      deleteRental(r.id, tripId).catch(() => alert("Couldn't delete the rental."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Rental car</h2>
          <p className="text-sm text-muted">
            From booking to the number plate on the key fob.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add rental
        </Button>
      </div>

      {rentals.length === 0 ? (
        <EmptyState
          icon={<Car className="h-8 w-8" />}
          title="No rental car yet"
          body="Save the company, pickup and drop-off details — and jot the plate number down when you pick it up."
          action={
            <Button variant="outline" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Add a rental
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {rentals.map((r) => (
            <RentalCard
              key={r.id}
              rental={r}
              onEdit={() => { setEditing(r); setOpen(true); }}
              onDelete={() => handleDelete(r)}
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit rental" : "Add a rental"}
      >
        <RentalForm
          tripId={tripId}
          rental={editing ?? undefined}
          onSaved={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}