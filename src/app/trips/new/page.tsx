import { redirect } from "next/navigation";
import { getActiveTripCount, getCurrentUser } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { TripForm } from "@/components/trips/trip-form";

export const metadata = { title: "New trip" };

export const dynamic = "force-dynamic";

export default async function NewTripPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveTripCount(user.id);
  const remaining = Math.max(0, 5 - active);

  return (
    <>
      <SiteHeader showNewTrip={false} email={user.email ?? undefined} name={user.user_metadata?.full_name ?? undefined} />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12 sm:px-6">
        <p className="micro text-muted">New adventure</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Where to next?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Set the basics now - you can shape flights, rental, and each day&apos;s
          plan right after.
        </p>

        <div className="mt-8 rounded-3xl border border-line/70 bg-card p-6 shadow-card sm:p-8">
          <TripForm remaining={remaining} />
        </div>
      </main>
    </>
  );
}