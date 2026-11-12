import {
  ICONS,
  connectBunnyApp,
  dayDate,
  esc,
  fmtClock,
  fmtDayLabel,
  payloadFrom,
  textOf,
} from "../../shared/app";
import "./styles.css";

interface ItineraryItem {
  id: string;
  day_number: number;
  title: string;
  place_name: string | null;
  lat: number | null;
  lng: number | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  stay_id: string | null;
  sort_order: number;
}

interface Stay {
  id: string;
  name: string | null;
}

interface TripInfo {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  completed: boolean;
}

interface ItineraryPayload {
  trip_id: string;
  can_write?: boolean;
  trip?: TripInfo;
  itinerary: ItineraryItem[];
  stays?: Stay[];
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

let payload: ItineraryPayload | null = null;

function stayName(id: string | null): string | null {
  if (!id) return null;
  return payload?.stays?.find((stay) => stay.id === id)?.name ?? null;
}

function itemRow(item: ItineraryItem): string {
  const pinned = item.lat != null && item.lng != null;
  const start = fmtClock(item.start_time);
  const end = fmtClock(item.end_time);
  const stay = stayName(item.stay_id);

  const meta = [
    item.place_name
      ? `<span class="meta meta-rust">${ICONS.pin}${esc(item.place_name)}${
          pinned ? `<span class="badge badge-sea">pinned</span>` : ""
        }</span>`
      : "",
    stay
      ? `<span class="meta meta-amber">${ICONS.bed}${esc(stay)}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <li class="stop">
      <div class="stop-time">
        <span class="stop-start">${esc(start || "-")}</span>
        ${end ? `<span class="stop-end">${esc(end)}</span>` : ""}
      </div>
      <div class="stop-body">
        <h3 class="stop-title">${esc(item.title)}</h3>
        ${meta ? `<div class="meta-row">${meta}</div>` : ""}
        ${
          item.notes
            ? `<p class="note-box">${ICONS.note}<span>${esc(item.notes)}</span></p>`
            : ""
        }
      </div>
    </li>
  `;
}

function daySection(
  dayNumber: number,
  items: ItineraryItem[],
  startDate: string | undefined,
): string {
  const date = dayDate(startDate, dayNumber);
  const label = fmtDayLabel(date);
  const stops = items.length === 1 ? "1 stop" : `${items.length} stops`;

  return `
    <section class="day">
      <header class="day-head">
        <span class="day-pill">Day ${dayNumber}</span>
        ${label ? `<span class="day-label">${esc(label)}</span>` : ""}
        <span class="day-count">${esc(stops)}</span>
      </header>
      <ol class="timeline">${items.map(itemRow).join("")}</ol>
    </section>
  `;
}

function render(message?: string) {
  if (!root) return;
  if (message) {
    root.innerHTML = `<div class="notice">${esc(message)}</div>`;
    return;
  }
  if (!payload) {
    root.innerHTML = `<p class="status">Loading itinerary…</p>`;
    return;
  }
  const items = payload.itinerary ?? [];
  if (items.length === 0) {
    root.innerHTML = `<div class="empty"><strong>No plans yet</strong>This trip doesn't have any activities in bunny.</div>`;
    return;
  }

  const banner =
    payload.can_write === false
      ? `<div class="banner">This connection is read-only, so the itinerary can't be changed here.</div>`
      : payload.trip?.completed
        ? `<div class="banner">This trip is finished and locked.</div>`
        : "";

  const byDay = new Map<number, ItineraryItem[]>();
  for (const item of items) {
    const list = byDay.get(item.day_number) ?? [];
    list.push(item);
    byDay.set(item.day_number, list);
  }

  const sections = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, dayItems]) =>
      daySection(dayNumber, dayItems, payload?.trip?.start_date),
    )
    .join("");

  root.innerHTML = `${banner}<div class="stack">${sections}</div>`;
}

function isPayload(value: unknown): value is ItineraryPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as ItineraryPayload).itinerary),
  );
}

connectBunnyApp({
  name: "bunny itinerary",
  onToolInput: () => render(),
  onToolResult: (result) => {
    if (result.isError) {
      render(textOf(result) || "bunny couldn't load the itinerary.");
      return;
    }
    const next = payloadFrom(result, isPayload);
    if (!next) {
      render("bunny couldn't read the itinerary.");
      return;
    }
    payload = next;
    render();
  },
  onError: (message) => render(message),
});
