"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Car, Map, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview", href: (id: string) => `/trips/${id}` },
  { id: "itinerary", label: "Itinerary", href: (id: string) => `/trips/${id}/itinerary` },
  { id: "flights", label: "Flights", href: (id: string) => `/trips/${id}/flights` },
  { id: "rental", label: "Rental", href: (id: string) => `/trips/${id}/rental` },
] as const;

const icons: Record<string, React.ReactNode> = {
  overview: <Calendar className="h-3.5 w-3.5" />,
  itinerary: <Map className="h-3.5 w-3.5" />,
  flights: <Plane className="h-3.5 w-3.5" />,
  rental: <Car className="h-3.5 w-3.5" />,
};

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const active = tabs.find((t) => (t.id === "overview" ? pathname === `/trips/${tripId}` : pathname.endsWith(`/${t.id}`)))?.id ?? "overview";

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-line/70 bg-card p-1 shadow-card">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href(tripId)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all",
              selected
                ? "bg-ink text-white shadow-sm"
                : "text-muted hover:bg-cream hover:text-ink",
            )}
          >
            {icons[tab.id]}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}