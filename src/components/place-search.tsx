"use client";

import React from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import type { PlaceResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlaceSearch({
  onSelect,
  placeholder = "Search a city, landmark, restaurant…",
  defaultValue,
  className,
}: {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  const [query, setQuery] = React.useState(defaultValue ?? "");
  const [results, setResults] = React.useState<PlaceResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const seq = React.useRef(0);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onChange(v: string) {
    setQuery(v);
    setHighlight(0);
    if (timer.current) clearTimeout(timer.current);

    if (v.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const mySeq = ++seq.current;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(v)}`);
        const data = (await res.json()) as { results: PlaceResult[] };
        if (seq.current === mySeq) {
          setResults(data.results);
          setOpen(true);
        }
      } catch {
        if (seq.current === mySeq) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        if (seq.current === mySeq) setLoading(false);
      }
    }, 280);
  }

  function choose(place: PlaceResult) {
    setQuery(place.name);
    setOpen(false);
    onSelect(place);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const place = results[highlight];
      if (place) choose(place);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const hasResults = open && results.length > 0;

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={hasResults}
        aria-controls="place-search-results"
        aria-autocomplete="list"
        className="h-11 w-full rounded-xl border border-line-strong bg-card pl-10 pr-10 text-[15px] text-ink placeholder:text-muted/70 transition-shadow focus:border-rust focus:outline-none focus:ring-[3px] focus:ring-rust/15"
      />
      {loading ? (
        <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
      ) : query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-cream"
        >
          ×
        </button>
      ) : null}

      {hasResults ? (
        <ul
          id="place-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-pop"
        >
          {results.map((place, i) => (
            <li key={`${place.name}-${i}`} role="presentation">
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(place)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                  i === highlight ? "bg-cream" : "bg-transparent",
                )}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rust" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {place.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {place.address}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}