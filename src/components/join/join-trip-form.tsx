"use client";

import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { joinTripByToken } from "@/lib/actions/trips";
import { Button } from "@/components/ui";

export function JoinTripForm({ token }: { token: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function join() {
    setError(null);
    startTransition(async () => {
      try {
        await joinTripByToken(token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't join this trip.");
      }
    });
  }

  return (
    <>
      <Button onClick={join} disabled={pending} size="lg" className="w-full">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {pending ? "Joining…" : "Join this trip"}
      </Button>
      {error ? (
        <p className="rounded-xl border border-rust/25 bg-rust-soft px-4 py-2.5 text-sm font-medium text-rust-deep">
          {error}
        </p>
      ) : null}
    </>
  );
}