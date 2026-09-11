import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Car,
  Compass,
  Map,
  NotebookPen,
  Plane,
  Stamp,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data";
import { SiteMark } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Top nav */}
      <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <SiteMark />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-cream"
          >
            Sign in
          </Link>
          <Link
            href="/login?next=/trips/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-rust px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgba(195,85,42,0.7)] transition-colors hover:bg-rust-deep"
          >
            Start planning <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 pb-20 text-center">
        {/* floating ticket decor */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <MockTicket
            className="absolute left-8 top-24 rotate-[-7deg] animate-float"
            delay="0s"
          />
          <MockTicket
            className="absolute right-10 top-32 rotate-[5deg] animate-float"
            delay="2.5s"
          />
          <MockStamp
            className="absolute left-36 top-[26rem] rotate-[-10deg] animate-float"
            delay="1.2s"
          />
          <MockStamp
            className="absolute right-40 top-[24rem] rotate-[8deg] animate-float"
            delay="0.6s"
          />
        </div>

        <p className="micro animate-fade-up text-rust" style={{ animationDelay: "80ms" }}>
          Trip planning, reimagined
        </p>
        <h1
          className="mt-4 max-w-3xl animate-fade-up font-display text-6xl font-semibold leading-[0.98] tracking-tight sm:text-7xl"
          style={{ animationDelay: "160ms" }}
        >
          Your next trip,
          <br />
          <span className="text-rust">perfectly planned.</span>
        </h1>
        <p
          className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-ink-soft"
          style={{ animationDelay: "240ms" }}
        >
          Inspired by my wife&apos;s love for planning and extreme
          attention to detail.
        </p>

        <div
          className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "320ms" }}
        >
          <Link
            href="/login?next=/trips/new"
            className="inline-flex h-13 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-semibold text-white shadow-[0_16px_32px_-12px_rgba(33,37,46,0.55)] transition-all hover:-translate-y-0.5 hover:bg-ink-soft"
          >
            <Calendar className="h-4.5 w-4.5" /> Plan your first trip
          </Link>
          <Link
            href="/login"
            className="inline-flex h-13 items-center rounded-full border border-line-strong bg-card px-7 text-[15px] font-semibold text-ink transition-colors hover:border-ink/30"
          >
            Create an account
          </Link>
        </div>
      </div>

      {/* Feature strip */}
      <section className="relative z-10 border-t border-line/70 bg-cream/40">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Plane,
              title: "Flights, in a boarding pass",
              body: "Airline, number, times, seat, and booking — everything you'll shove in your pocket.",
            },
            {
              icon: Car,
              title: "Rental, down to the plate",
              body: "Pickup, drop-off, booking ref — and a slot for the car's number, when you get the keys.",
            },
            {
              icon: Map,
              title: "Day-by-day itinerary",
              body: "One plan per day, reorderable, with a live map of everything you've pinned.",
            },
            {
              icon: NotebookPen,
              title: "Notes & rough times",
              body: "Search real places, add notes and loose timings. Plan loosely, enjoy fully.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-soft text-sea-deep">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-line/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-7 text-sm text-muted">
          <p className="inline-flex items-center gap-2">
            <Compass className="h-4 w-4 text-rust" /> bunny — plan. pack. go.
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs">
            <Stamp className="h-3.5 w-3.5 text-amber" /> Built for wanderers
          </p>
        </div>
      </footer>
    </main>
  );
}

function MockTicket({ className, delay }: { className: string; delay: string }) {
  return (
    <div
      className={`w-60 rounded-2xl border border-line bg-card p-4 shadow-pop ${className}`}
      style={{ ["--float-rotate" as string]: "0deg", animationDelay: delay }}
    >
      <div className="flex items-center justify-between">
        <span className="micro text-muted">Boarding pass</span>
        <Plane className="h-4 w-4 text-rust" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="font-display text-4xl font-semibold text-ink">LIS</span>
        <span className="flex-1 border-t-2 border-dashed border-line-strong" />
        <span className="font-display text-4xl font-semibold text-ink">FCO</span>
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-muted">
        Lisbon → Rome · TP 2340 · Seat 21A
      </p>
    </div>
  );
}

function MockStamp({ className, delay }: { className: string; delay: string }) {
  return (
    <div
      className={`flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-rust/40 text-center ${className}`}
      style={{ ["--float-rotate" as string]: "0deg", animationDelay: delay }}
    >
      <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-rust">
        Day 1
        <br />
        planned
      </span>
    </div>
  );
}