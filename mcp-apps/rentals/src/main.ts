import type { CallToolResult } from "@modelcontextprotocol/client";
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

const PLATE_MAX = 12;

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

let payload: RentalsPayload | null = null;
/** Unsaved plate drafts: rental id → plate. */
const drafts = new Map<string, string>();
const saving = new Set<string>();
const errors = new Map<string, string>();
const savedAt = new Map<string, number>();

function isEditable(): boolean {
  return Boolean(
    payload && payload.can_write !== false && !payload.trip?.completed,
  );
}

function originalPlate(rentalId: string): string {
  return payload?.rentals.find((rental) => rental.id === rentalId)?.car_plate ?? "";
}

function draftPlate(rentalId: string): string {
  const draft = drafts.get(rentalId);
  return draft !== undefined ? draft : originalPlate(rentalId);
}

function driverNames(rental: Rental, people: Person[]): string[] {
  return rental.driver_ids
    .map(
      (id) => people.find((person) => person.user_id === id)?.full_name ?? "",
    )
    .filter(Boolean);
}

function plateField(rental: Rental): string {
  if (!isEditable()) {
    return `<p class="${rental.car_plate ? "plate" : "plate plate-empty"}">${esc(
      rental.car_plate || "_____",
    )}</p>`;
  }

  const error = errors.get(rental.id);
  return `
    <input
      class="plate-input"
      data-rental="${esc(rental.id)}"
      value="${esc(draftPlate(rental.id))}"
      maxlength="${PLATE_MAX}"
      autocomplete="off"
      spellcheck="false"
      aria-label="Number plate"
    />
    <div class="plate-actions">
      <button
        type="button"
        class="btn btn-primary"
        data-action="save-plate"
        data-rental="${esc(rental.id)}"
        disabled
      >Save plate</button>
      <span class="save-state" data-state="${esc(rental.id)}"></span>
    </div>
    ${error ? `<p class="card-error">${esc(error)}</p>` : ""}
  `;
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
        ${plateField(rental)}
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

function updatedRentalFrom(result: CallToolResult): Rental | null {
  const structured = result.structuredContent as { rental?: Rental } | undefined;
  if (structured?.rental) return structured.rental;
  try {
    const parsed = JSON.parse(textOf(result)) as { rental?: Rental };
    return parsed.rental ?? null;
  } catch {
    return null;
  }
}

function plateInput(rentalId: string): HTMLInputElement | null {
  if (!root) return null;
  return root.querySelector<HTMLInputElement>(
    `.plate-input[data-rental="${CSS.escape(rentalId)}"]`,
  );
}

function refreshRentalState(rentalId: string) {
  if (!root) return;
  const input = plateInput(rentalId);
  const dirty = input
    ? input.value.trim().toUpperCase() !== originalPlate(rentalId)
    : false;

  const save = root.querySelector<HTMLButtonElement>(
    `button[data-action="save-plate"][data-rental="${CSS.escape(rentalId)}"]`,
  );
  if (save) save.disabled = !dirty || saving.has(rentalId);

  const state = root.querySelector<HTMLElement>(
    `[data-state="${CSS.escape(rentalId)}"]`,
  );
  if (state) {
    if (saving.has(rentalId)) state.textContent = "Saving…";
    else if (dirty) state.textContent = "Unsaved";
    else if (savedAt.has(rentalId)) state.textContent = "Saved";
    else state.textContent = "";
  }
}

async function savePlate(rentalId: string) {
  if (!payload || saving.has(rentalId)) return;
  const rental = payload.rentals.find((item) => item.id === rentalId);
  if (!rental) return;

  const input = plateInput(rentalId);
  if (!input) return;
  const car_plate = input.value.trim().toUpperCase();

  saving.add(rentalId);
  errors.delete(rentalId);
  savedAt.delete(rentalId);
  refreshRentalState(rentalId);
  input.disabled = true;

  try {
    const result = await app.callServerTool({
      name: "set_rental_plate",
      arguments: { rental_id: rentalId, car_plate },
    });
    if (result.isError)
      throw new Error(textOf(result) || "bunny couldn't save the number plate.");

    const updated = updatedRentalFrom(result);
    if (!updated) throw new Error("bunny didn't return the updated rental.");

    const index = payload.rentals.findIndex((item) => item.id === rentalId);
    if (index >= 0) payload.rentals[index] = updated;
    drafts.delete(rentalId);
    savedAt.set(rentalId, Date.now());
  } catch (error) {
    errors.set(
      rentalId,
      error instanceof Error ? error.message : "Couldn't save the number plate.",
    );
  } finally {
    saving.delete(rentalId);
    render();
    if (savedAt.has(rentalId)) {
      window.setTimeout(() => {
        savedAt.delete(rentalId);
        if (payload) render();
      }, 4000);
    }
  }
}

root.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.classList.contains("plate-input")) return;

  const rentalId = input.dataset.rental ?? "";
  const value = input.value.toUpperCase().slice(0, PLATE_MAX);
  if (input.value !== value) input.value = value;

  drafts.set(rentalId, value);
  refreshRentalState(rentalId);
});

root.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.classList.contains("plate-input")) return;
  event.preventDefault();
  void savePlate(input.dataset.rental ?? "");
});

root.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>(
    'button[data-action="save-plate"]',
  );
  if (!button) return;
  void savePlate(button.dataset.rental ?? "");
});

const app = connectBunnyApp({
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
    drafts.clear();
    errors.clear();
    savedAt.clear();
    render();
  },
  onError: (message) => render(message),
});
