import type { Metadata } from "next";
import Image from "next/image";
import { Link2, Map, Plane, Sun } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(
  props: PageProps<"/login">,
) {
  const searchParams = await props.searchParams;
  const raw = searchParams.next;
  const next = typeof raw === "string" && raw ? raw : "/dashboard";

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sea-deep text-cream lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="h-full w-full paper-texture" />
        </div>
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-cream/20">
            <Image
              src="/bunny logo white.jpeg"
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">bunny</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md font-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Every great trip starts with a plan.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-cream/80">
            Flights, rental cars, and a day-by-day itinerary — organized like
            a beautifully stamped passport, ready before your bags are packed.
            Inspired by my wife&apos;s love for planning and extreme attention
            to detail.
          </p>

          <div className="mt-10 grid max-w-sm gap-3">
            {[
              { icon: Sun, text: "Day-by-day itinerary planning" },
              { icon: Plane, text: "Flight details at a glance" },
              { icon: Map, text: "Searched places with notes & times" },
              { icon: Link2, text: "Rental info, right down to the plate" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl border border-cream/10 bg-cream/5 px-4 py-2.5 text-sm text-cream/90"
              >
                <Icon className="h-4 w-4 text-amber" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs uppercase tracking-[0.22em] text-cream/50">
          Plan. Pack. Go.
        </p>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-16">
        <LoginForm next={next} />
      </div>
    </main>
  );
}