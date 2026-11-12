import {
  ICONS,
  connectBunnyApp,
  esc,
  fmtDateTime,
  fmtShortDateTime,
  payloadFrom,
  textOf,
} from "../../shared/app";
import "./styles.css";

interface Rental {
  id: string;
  driver_ids: string[];
  company: string | null;
  booking_ref: string | null;
  car_model: string | null;
  car_plate: string | null;
  pickup_place: string | null;
  pickup_time: string | null;
  dropoff_place: string | null;
  dropoff_time: string | null;
  notes: string | null;
}

interface Person {
  user_id: string;
  full_name: string;
}

interface TripInfo {
  id: string;
  title: string;
  completed: boolean;
}

interface RentalsPayload {
  trip_id: string;
  can_write?: boolean;
  trip?: TripInfo;
  rentals: Rental[];
  people: Person[];
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

let payload: RentalsPayload | null = null;

function driverNames(rental: Rental, people: Person[]): string[] {
  return rental.driver_ids
    .map(
      (id) => people.find((person) => person.user_id === id)?.full_name ?? "",
    )
    .filter(Boolean);
}

function rentalCard(rental: Rental, people: Person[]): string {
  const drivers = driverNames(rental, people);
  const driverBadges = drivers.length
    ? drivers
        .map((name) => `<span class="badge badge-sea">${esc(name)}</span>`)
        .join("")
    : `<span class="badge badge-amber">Whole trip</span>`;

  return `
    <article class="ticket">
      <div class="ticket-main">
        <div class="row">
          <span class="icon-badge">${ICONS.car}</span>
          <div class="rental-head">
            <p class="micro">${esc(rental.company || "Rental car")}</p>
            <h2 class="heading">${esc(rental.car_model || "Car")}</h2>
            <div class="badges">${driverBadges}</div>
          </div>
        </div>

        <div class="rental-times">
          <div class="time-block">
            <p class="micro">Pickup</p>
            <p class="time-main time-sea">${esc(fmtDateTime(rental.pickup_time))}</p>
            ${
              rental.pickup_place
                ? `<p class="meta">${ICONS.pin}${esc(rental.pickup_place)}</p>`
                : ""
            }
          </div>
          <span class="time-arrow" aria-hidden="true">→</span>
          <div class="time-block time-block-end">
            <p class="micro">Drop-off</p>
            <p class="time-main time-rust">${esc(fmtDateTime(rental.dropoff_time))}</p>
            ${
              rental.dropoff_place
                ? `<p class="meta">${ICONS.pin}${esc(rental.dropoff_place)}</p>`
                : ""
            }
          </div>
        </div>

        ${
          rental.notes
            ? `<p class="note-box">${ICONS.note}<span>${esc(rental.notes)}</span></p>`
            : ""
        }
      </div>

      <div class="stub">
        <p class="micro">Booking</p>
        <p class="mono">${esc(rental.booking_ref || "-")}</p>
        <p class="micro">Car no</p>
        <p class="${rental.car_plate ? "plate" : "plate plate-empty"}">${esc(
          rental.car_plate || "_____",
        )}</p>
        <p class="micro">Pickup</p>
        <p class="stub-time stub-sea">${esc(fmtShortDateTime(rental.pickup_time))}</p>
        <p class="micro">Drop-off</p>
        <p class="stub-time stub-rust">${esc(
          fmtShortDateTime(rental.dropoff_time),
        )}</p>
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
    root.innerHTML = `<p class="status">Loading car rentals…</p>`;
    return;
  }
  const rentals = payload.rentals ?? [];
  if (rentals.length === 0) {
    root.innerHTML = `<div class="empty"><strong>No rental car yet</strong>This trip doesn't have a car rental saved in bunny.</div>`;
    return;
  }

  const banner =
    payload.can_write === false
      ? `<div class="banner">This connection is read-only, so the rental can't be changed here.</div>`
      : payload.trip?.completed
        ? `<div class="banner">This trip is finished and locked.</div>`
        : "";

  const people = payload.people ?? [];
  root.innerHTML = `${banner}<div class="stack">${rentals
    .map((rental) => rentalCard(rental, people))
    .join("")}</div>`;
}

function isPayload(value: unknown): value is RentalsPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as RentalsPayload).rentals),
  );
}

connectBunnyApp({
  name: "bunny rentals",
  onToolInput: () => render(),
  onToolResult: (result) => {
    if (result.isError) {
      render(textOf(result) || "bunny couldn't load the car rentals.");
      return;
    }
    const next = payloadFrom(result, isPayload);
    if (!next) {
      render("bunny couldn't read the rental details.");
      return;
    }
    payload = next;
    render();
  },
  onError: (message) => render(message),
});
