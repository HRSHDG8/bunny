"use client";

import React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTrip } from "@/lib/actions/trips";
import { Button, IconButton, Modal } from "@/components/ui";

export function DeleteTripButton({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTrip(tripId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't delete the trip.");
      }
    });
  }

  return (
    <>
      <IconButton label="Delete trip" onClick={() => setOpen(true)} className="text-rust hover:bg-rust-soft">
        <Trash2 className="h-4 w-4" />
      </IconButton>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete trip?">
        <p className="text-sm text-ink-soft">
<span className="font-semibold text-ink">{tripName}</span> and its
        flights, rental, and itinerary will be permanently removed. This
        can&apos;t be undone.
        </p>
        {error ? (
          <p className="mt-3 rounded-xl border border-rust/25 bg-rust-soft px-4 py-2.5 text-sm font-medium text-rust-deep">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete trip
          </Button>
        </div>
      </Modal>
    </>
  );
}