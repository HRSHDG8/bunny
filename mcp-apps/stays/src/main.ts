import {
  ICONS,
  connectBunnyApp,
  esc,
  fmtDateTime,
  fmtShortDateTime,
  parseWall,
  payloadFrom,
  textOf,
} from "../../shared/app";
import "./styles.css";

interface Stay {
  id: string;
  name: string | null;
  place_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  check_in: string | null;
  check_out: string | null;
  booking_ref: string | null;
  notes: string | null;
}

interface TripInfo {
  id: string;
  title: string;
  completed: boolean;
}

interface StaysPayload {
  trip_id: string;
  can_write?: boolean;
  trip?: TripInfo;
  stays: Stay[];
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

let payload: StaysPayload | null = null;

function nights(stay: Stay): number | null {
  const checkIn = parseWall(stay.check_in);
  const checkOut = parseWall(stay.check_out);
  if (!checkIn || !checkOut) return null;
  const diff = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / 86_400_000,
  );
  return diff > 0 ? diff : null;
}

function stayCard(stay: Stay): string {
  const count = nights(stay);
  const label = count ? `${count} ${count === 1 ? "night" : "nights"}` : "Stay";
  const pinned = stay.lat != null && stay.lng != null;

  return `
    <article class="ticket">
      <div class="ticket-main">
        <div class="row">
          <span class="icon-badge">${ICONS.bed}</span>
          <div class="stay-head">
            <p class="micro">${esc(label)}</p>
            <h2 class="heading">${esc(stay.name || "Accommodation")}</h2>
            ${
              stay.place_name
                ? `<p class="meta meta-rust stay-place">${ICONS.pin}${esc(
                    stay.place_name,
                  )}${pinned ? `<span class="badge badge-sea">pinned</span>` : ""}</p>`
                : ""
            }
          </div>
        </div>

        <div class="stay-times">
          <div class="time-block">
            <p class="micro">Check-in</p>
            <p class="time-main time-sea">${esc(fmtDateTime(stay.check_in))}</p>
          </div>
          <span class="time-arrow" aria-hidden="true">→</span>
          <div class="time-block time-block-end">
            <p class="micro">Check-out</p>
            <p class="time-main time-rust">${esc(fmtDateTime(stay.check_out))}</p>
          </div>
        </div>

        ${
          stay.address
            ? `<p class="meta stay-address">${ICONS.pin}${esc(stay.address)}</p>`
            : ""
        }
        ${
          stay.notes
            ? `<p class="note-box">${ICONS.note}<span>${esc(stay.notes)}</span></p>`
            : ""
        }
      </div>

      <div class="stub">
        <p class="micro">Booking</p>
        <p class="mono">${esc(stay.booking_ref || "-")}</p>
        <p class="micro">Check-in</p>
        <p class="stub-time stub-sea">${esc(fmtShortDateTime(stay.check_in))}</p>
        <p class="micro">Check-out</p>
        <p class="stub-time stub-rust">${esc(fmtShortDateTime(stay.check_out))}</p>
      </div>
    </article>
  `;
}

function render(message?: string) {
  if (!root) return;
  if (message) {
    root.innerHTML = `<div class="notice">${esc(message)}</div>`;
    return;
  }
  if (!payload) {
    root.innerHTML = `<p class="status">Loading stays…</p>`;
    return;
  }
  const stays = payload.stays ?? [];
  if (stays.length === 0) {
    root.innerHTML = `<div class="empty"><strong>No stays yet</strong>This trip doesn't have any accommodation saved in bunny.</div>`;
    return;
  }

  const banner =
    payload.can_write === false
      ? `<div class="banner">This connection is read-only, so the booking details can't be changed here.</div>`
      : payload.trip?.completed
        ? `<div class="banner">This trip is finished and locked.</div>`
        : "";

  root.innerHTML = `${banner}<div class="stack">${stays
    .map(stayCard)
    .join("")}</div>`;
}

function isPayload(value: unknown): value is StaysPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as StaysPayload).stays),
  );
}

connectBunnyApp({
  name: "bunny stays",
  onToolInput: () => render(),
  onToolResult: (result) => {
    if (result.isError) {
      render(textOf(result) || "bunny couldn't load the stays.");
      return;
    }
    const next = payloadFrom(result, isPayload);
    if (!next) {
      render("bunny couldn't read the stay details.");
      return;
    }
    payload = next;
    render();
  },
  onError: (message) => render(message),
});
