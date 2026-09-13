"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
  email,
  name,
}: {
  email?: string;
  name?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const [isDark, setIsDark] = React.useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bunny-theme", next ? "dark" : "light");
  }

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sea-solid text-[13px] font-bold text-white ring-2 ring-sea-soft transition-transform hover:scale-105"
      >
        {initials(name ?? email)}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-line bg-card p-2 shadow-pop">
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">
              {name ?? "Traveler"}
            </p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-cream"
          >
            <span className="flex items-center gap-2">
              {mounted ? (
                isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
            </span>
            <span
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                isDark ? "bg-sea-solid" : "bg-line-strong",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                  isDark ? "left-[18px]" : "left-0.5",
                )}
              />
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(email ?? "").then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-cream"
          >
            {copied ? "Copied email" : "Copy email"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rust transition-colors hover:bg-rust-soft"
          >
            <LogOut className="h-4 w-4" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}