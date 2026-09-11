import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteMark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_10px_20px_-8px_rgba(195,85,42,0.35)] ring-1 ring-line/60 transition-transform group-hover:-rotate-6">
        <Image
          src="/bunny logo white.jpeg"
          alt="bunny"
          width={36}
          height={36}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="font-display text-[22px] font-semibold tracking-tight text-ink">
        bunny
      </span>
    </Link>
  );
}