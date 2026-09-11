import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { getCurrentUser, getTripPreview } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { JoinTripForm } from "@/components/join/join-trip-form";

export const metadata = { title: "Join a trip" };

export const dynamic = "force-dynamic";

export default async function JoinPage(props: PageProps<"/join">) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === "string" ? searchParams.token : "";

  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/join?token=${encodeURIComponent(token)}`)}`,
    );
  }

  const preview = token
    ? await getTripPreview(token).catch(() => null)
    : null;

  return (
    <>
      <SiteHeader
        showNewTrip={false}
        email={user.email ?? undefined}
        name={user.user_metadata?.full_name ?? undefined}
      />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 sm:px-6">
        {preview ? (
          <div className="overflow-hidden rounded-3xl border border-line/70 bg-card shadow-pop">
            <div className="relative bg-gradient-to-br from-ink via-ink to-sea-deep p-7 text-cream">
              <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-cream/5" />
              <p className="micro text-cream/60">Trip invite</p>
              <h1 className="mt-1.5 flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
                <MapPin className="h-6 w-6 text-amber" />
                {preview.destination}
              </h1>
              <p className="mt-1 text-[15px] text-cream/75">{preview.title}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[13px] text-cream/85">
                {format(new Date(`${preview.start_date}T00:00:00`), "MMM d, yyyy")}
                {" — "}
                {format(new Date(`${preview.end_date}T00:00:00`), "MMM d, yyyy")}
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm leading-relaxed text-ink-soft">
                You&apos;re signed in as{" "}
                <span className="font-semibold text-ink">{user.email}</span>.
                Joining adds this trip to your dashboard so you can plan it
                together.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <JoinTripForm token={token} />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-line/70 bg-card p-8 text-center shadow-card">
            <MapPin className="mx-auto h-8 w-8 text-muted" />
            <h1 className="mt-3 font-display text-2xl font-semibold">
              This invite isn&apos;t valid
            </h1>
            <p className="mt-2 text-sm text-muted">
              The link may be expired, revoked, or incomplete. Ask the trip
              owner for a fresh one.
            </p>
          </div>
        )}
      </main>
    </>
  );
}