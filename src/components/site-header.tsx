import Link from "next/link";
import { Plus } from "lucide-react";
import { SiteMark } from "@/components/brand";
import { UserMenu } from "@/components/user-menu";

export function SiteHeader({
  email,
  name,
  showNewTrip = true,
}: {
  email?: string;
  name?: string;
  showNewTrip?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <SiteMark />
        <div className="flex items-center gap-2">
          {showNewTrip ? (
            <Link
              href="/trips/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rust px-4 text-[13px] font-semibold text-white transition-colors hover:bg-rust-deep"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New trip</span>
            </Link>
          ) : null}
          <UserMenu email={email} name={name} />
        </div>
      </div>
    </header>
  );
}