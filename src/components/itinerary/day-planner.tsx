"use client";

import React from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { ItineraryItem } from "@/lib/types";
import {
  deleteItineraryItem,
  moveItineraryItem,
} from "@/lib/actions/itinerary";
import { ItineraryItemForm } from "@/components/itinerary/itinerary-item-form";
import { DayMap } from "@/components/itinerary/day-map";
import { Button, EmptyState, IconButton, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DayInfo {
  dayNumber: number;
  date: string;
  label: string;
}

export function DayPlanner({
  tripId,
  days,
  items,
  locked = false,
}: {
  tripId: string;
  days: DayInfo[];
  items: ItineraryItem[];
  locked?: boolean;
}) {
  const [activeDay, setActiveDay] = React.useState(days[0]?.dayNumber ?? 1);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ItineraryItem | null>(null);

  const dayItems = items.filter((i) => i.day_number === activeDay);
  const activeDayInfo = days.find((d) => d.dayNumber === activeDay);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(item: ItineraryItem) {
    setEditing(item);
    setOpen(true);
  }
  function handleDelete(item: ItineraryItem) {
    if (confirm(`Remove "${item.title}" from Day ${item.day_number}?`)) {
      deleteItineraryItem(item.id, tripId).catch(() =>
        alert("Couldn't delete the activity."),
      );
    }
  }
  function handleMove(item: ItineraryItem, direction: "up" | "down") {
    moveItineraryItem(item.id, tripId, direction).catch(() =>
      alert("Couldn't reorder the activity."),
    );
  }

  const mapMarkers = dayItems
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({ lat: i.lat!, lng: i.lng!, title: i.title }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Itinerary</h2>
          <p className="text-sm text-muted">
            Plot each day like a stamped passport.
          </p>
        </div>
        {!locked ? (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add an activity
          </Button>
        ) : null}
      </div>

      {/* Day picker */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
              const count = items.filter((i) => i.day_number === d.dayNumber).length;
              const selected = d.dayNumber === activeDay;
              const [weekday, monthDay] = d.label.split(",");
              return (
                <button
                  key={d.dayNumber}
                  type="button"
                  onClick={() => setActiveDay(d.dayNumber)}
                  className={cn(
                    "group shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-all",
                    selected
                      ? "border-transparent bg-sea-solid text-white shadow-[0_12px_24px_-12px_rgba(47,111,106,0.7)]"
                      : "border-line bg-card text-ink hover:border-sea/40 hover:bg-sea-soft/50",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[10px] font-bold uppercase tracking-[0.15em]",
                      selected ? "text-white/70" : "text-muted",
                    )}
                  >
                    Day {d.dayNumber} · {weekday}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold">
                    {monthDay.trim()}{" "}
                    <span className={cn("font-normal", selected ? "text-white/70" : "text-muted")}>
                      {d.date.split("-")[0]}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      count > 0 ? (selected ? "bg-white/15 text-white" : "bg-rust-soft text-rust-deep") : "bg-cream text-muted",
                    )}
                  >
                    {count} {count === 1 ? "stop" : "stops"}
                  </span>
                </button>
              );
            })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Timeline */}
        <div className="min-w-0">
          {dayItems.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-7 w-7" />}
              title={`Day ${activeDay} is wide open`}
              body="Search a place, add notes and rough times - the map pins it automatically."
              action={
                !locked ? (
                  <Button onClick={openNew} variant="outline">
                    <Plus className="h-4 w-4" /> Plan {activeDayInfo?.label.split(",")[0]}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ol className="relative space-y-4">
              <span
                aria-hidden="true"
                className="absolute bottom-2 left-3 top-2 w-0 rounded-full border-l-2 border-dashed border-line-strong"
              />
              {dayItems.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  isFirst={index === 0}
                  isLast={index === dayItems.length - 1}
                  locked={locked}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item)}
                  onMoveUp={() => handleMove(item, "up")}
                  onMoveDown={() => handleMove(item, "down")}
                />
              ))}
            </ol>
          )}
        </div>

        {/* Map */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {mapMarkers.length > 0 ? (
            <DayMap key={activeDay} markers={mapMarkers} title={`Day ${activeDay} on the map`} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-card/40 px-6 py-10 text-center">
              <MapPin className="h-6 w-6 text-line-strong" />
              <p className="text-sm font-semibold text-muted">No pins yet</p>
              <p className="text-xs text-muted">
                Add places to activities and they&apos;ll appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? `Edit · Day ${editing.day_number}`
            : `Add to Day ${activeDay} · ${activeDayInfo?.label ?? ""}`
        }
      >
        <ItineraryItemForm
          tripId={tripId}
          dayNumber={editing?.day_number ?? activeDay}
          item={editing ?? undefined}
          onSaved={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}

function TimelineItem({
  item,
  isFirst,
  isLast,
  locked = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: ItineraryItem;
  isFirst: boolean;
  isLast: boolean;
  locked?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <li className="relative pl-10">
      {/* route node */}
      <span
        className={cn(
          "absolute left-[3px] top-6 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 bg-card",
          item.lat != null && item.lng != null
            ? "border-rust"
            : "border-line-strong",
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            item.lat != null && item.lng != null ? "bg-rust" : "bg-line-strong",
          )}
        />
      </span>

      <div className="group relative rounded-2xl border border-line/70 bg-card p-4 pr-2 shadow-card transition-shadow hover:shadow-pop sm:p-5 sm:pr-3">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* time */}
          <div className="w-14 shrink-0 text-center sm:w-16">
            <p className="font-display text-2xl font-semibold leading-none text-ink">
              {item.start_time ? item.start_time.slice(0, 5) : "-"}
            </p>
            {item.end_time ? (
              <p className="mt-1 text-[11px] font-semibold text-muted">
                {item.end_time.slice(0, 5)}
              </p>
            ) : null}
          </div>

          {/* divider */}
          <div className="self-stretch border-l border-dashed border-line-strong sm:mx-1" />

          {/* content */}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink">
              {item.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {item.place_name ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
                  <MapPin className="h-3.5 w-3.5 text-rust" />
                  {item.place_name}
                  {item.lat != null && item.lng != null ? (
                    <span className="rounded bg-sea-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sea-deep">
                      pinned
                    </span>
                  ) : null}
                </span>
              ) : null}
              {item.start_time || item.end_time ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
                  <Clock className="h-3.5 w-3.5 text-sea" />
                  {item.start_time ? item.start_time.slice(0, 5) : "from start"}→{item.end_time ? item.end_time.slice(0, 5) : "soon"}
                </span>
              ) : null}
            </div>
            {item.notes ? (
              <p className="mt-2 inline-flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-soft">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                <span>{item.notes}</span>
              </p>
            ) : null}
          </div>

          {/* actions */}
          {!locked ? (
            <div className="flex shrink-0 flex-col items-center gap-0.5 self-start opacity-60 transition-opacity group-hover:opacity-100">
              <IconButton label="Move earlier" onClick={onMoveUp} disabled={isFirst} className="h-7 w-7 hover:bg-cream">
                <ChevronUp className="h-4 w-4" />
              </IconButton>
              <IconButton label="Move later" onClick={onMoveDown} disabled={isLast} className="h-7 w-7 hover:bg-cream">
                <ChevronDown className="h-4 w-4" />
              </IconButton>
              <IconButton label="Edit activity" onClick={onEdit} className="mt-1 h-7 w-7">
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label="Delete activity" onClick={onDelete} className="h-7 w-7 text-rust hover:bg-rust-soft">
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}