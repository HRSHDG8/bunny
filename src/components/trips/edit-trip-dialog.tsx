"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { Trip } from "@/lib/types";
import { IconButton, Modal } from "@/components/ui";
import { TripForm } from "@/components/trips/trip-form";

export function EditTripDialog({ trip }: { trip: Trip }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <IconButton label="Edit trip" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit trip">
        <TripForm trip={trip} onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}