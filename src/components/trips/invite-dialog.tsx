"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, Power, Users } from "lucide-react";
import type { Trip } from "@/lib/types";
import {
  enableTripSharing,
  revokeTripSharing,
  setTripSharingEmails,
} from "@/lib/actions/trips";
import { Badge, Button, IconButton, Modal, Textarea } from "@/components/ui";

const LINK_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
  "";

export function InviteDialog({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [emails, setEmails] = React.useState(trip.share_emails.join(", "));
  const [saved, setSaved] = React.useState(false);

  const shareToken = trip.share_token;
  const shareUrl = shareToken
    ? `${LINK_BASE || "http://localhost:3000"}/join?token=${shareToken}`
    : null;

  function withPending(action: () => Promise<void>) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function copyLink() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <IconButton
        label="Invite people"
        onClick={() => setOpen(true)}
        className="text-muted hover:text-ink"
      >
        <Users className="h-4 w-4" />
      </IconButton>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite people">
        <div className="space-y-5">
          {shareUrl ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone="sea">
                  <Link2 className="h-3 w-3" />
                  Sharing on
                </Badge>
              </div>

              <div>
                <p className="mb-1.5 block text-[13px] font-semibold text-ink">
                  Shareable link
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-xl border border-line-strong bg-cream px-3 py-2.5 font-mono text-[12px] text-ink"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyLink}
                    disabled={pending}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-sea-deep" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="mt-1.5 text-[13px] text-muted">
                  Anyone signed in with this link can join the trip.
                </p>
              </div>

              <div>
                <p className="mb-1.5 block text-[13px] font-semibold text-ink">
                  Only these people can join
                </p>
                <Textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="you@example.com, alex@example.com"
                  disabled={pending}
                />
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] text-muted sm:flex-1">
                    Leave empty to let anyone with the link join.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      withPending(async () => {
                        await setTripSharingEmails(trip.id, emails);
                        setSaved(true);
                      })
                    }
                    disabled={pending}
                    className="shrink-0 self-end sm:self-auto"
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save list
                  </Button>
                </div>
                {saved ? (
                  <p className="mt-2 text-[13px] font-medium text-sea-deep">
                    Guest list saved.
                  </p>
                ) : null}
              </div>

              <div className="border-t border-line pt-4">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    withPending(async () => {
                      await revokeTripSharing(trip.id);
                      setEmails("");
                    })
                  }
                  disabled={pending}
                >
                  <Power className="h-4 w-4" />
                  Turn off sharing
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-ink-soft">
                Sharing is off for this trip. Turn it on to get a link you can
                send to your travel companions.
              </p>
              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  onClick={() => withPending(() => enableTripSharing(trip.id))}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Share with a link
                </Button>
              </div>
            </div>
          )}

          {error ? (
            <p className="rounded-xl border border-rust/25 bg-rust-soft px-4 py-2.5 text-sm font-medium text-rust-deep">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}