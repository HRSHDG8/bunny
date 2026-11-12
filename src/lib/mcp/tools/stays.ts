import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  createStay,
  deleteStay,
  updateStay,
  type StayInput,
} from "@/lib/services/stays";
import { apiError } from "@/lib/supabase/errors";
import {
  registerTool,
  dateTimeString,
  merged,
  WRITE_SCOPE,
} from "@/lib/mcp/tools/shared";
import {
  loadStay,
  loadStays,
  loadTrip,
  tripSummary,
} from "@/lib/mcp/tools/queries";
import { STAYS_APP_URI } from "@/lib/mcp/apps/stays";
import type { Stay } from "@/lib/types";

const stayFields = {
  name: z
    .string()
    .describe("Name of the hotel, apartment or guesthouse.")
    .optional(),
  place_name: z.string().describe("Neighbourhood or place, e.g. 'Alfama, Lisbon'.").optional(),
  address: z.string().describe("Street address.").optional(),
  lat: z.number().describe("Latitude of the stay.").optional(),
  lng: z.number().describe("Longitude of the stay.").optional(),
  check_in: dateTimeString.describe("Check-in time (YYYY-MM-DDTHH:MM).").optional(),
  check_out: dateTimeString.describe("Check-out time (YYYY-MM-DDTHH:MM).").optional(),
  booking_ref: z.string().describe("Booking reference.").optional(),
  notes: z.string().describe("Door code, breakfast times, parking, anything useful.").optional(),
};

function toStayInput(args: Record<string, unknown>): StayInput {
  return {
    name: (args.name as string) ?? "",
    place_name: (args.place_name as string) ?? "",
    address: (args.address as string) ?? "",
    lat: (args.lat as number) ?? null,
    lng: (args.lng as number) ?? null,
    check_in: (args.check_in as string) ?? "",
    check_out: (args.check_out as string) ?? "",
    booking_ref: (args.booking_ref as string) ?? "",
    notes: (args.notes as string) ?? "",
  };
}

/** Keep whatever the caller didn't mention, so a partial edit stays partial. */
function mergeStayInput(current: Stay, args: Record<string, unknown>): StayInput {
  const text = (key: string, fallback: string | null) =>
    merged(args[key] as string | undefined, fallback, "");
  return {
    name: text("name", current.name),
    place_name: text("place_name", current.place_name),
    address: text("address", current.address),
    lat: args.lat === undefined ? current.lat : ((args.lat as number) ?? null),
    lng: args.lng === undefined ? current.lng : ((args.lng as number) ?? null),
    check_in: text("check_in", current.check_in),
    check_out: text("check_out", current.check_out),
    booking_ref: text("booking_ref", current.booking_ref),
    notes: text("notes", current.notes),
  };
}

async function stayTripId(
  supabase: Parameters<typeof loadStays>[0],
  stayId: string,
) {
  const { data, error } = await supabase
    .from("stays")
    .select("trip_id")
    .eq("id", stayId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the stay.", error);
  if (!data)
    throw new Error("That stay doesn't exist, or you don't have access to it.");
  return data.trip_id as string;
}

export function registerStayTools(server: McpServer) {
  registerTool(
    server,
    "list_stays",
    {
      title: "List stays",
      description: "List the hotels and other accommodation on a trip.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
      }),
      ui: { resourceUri: STAYS_APP_URI },
    },
    async ({ trip_id }, principal) => {
      const [stays, trip] = await Promise.all([
        loadStays(principal.supabase, trip_id),
        loadTrip(principal.supabase, trip_id),
      ]);
      return {
        trip_id,
        can_write: principal.scopes.includes(WRITE_SCOPE),
        trip: tripSummary(trip),
        stays,
      };
    },
  );

  registerTool(
    server,
    "create_stay",
    {
      title: "Add a stay",
      description:
        "Add a hotel, apartment or other accommodation to a trip, with check-in, check-out and booking details.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
        ...stayFields,
        name: z.string().describe("Name of the hotel, apartment or guesthouse."),
      }),
      write: true,
    },
    async ({ trip_id, ...rest }, principal) => {
      const stayId = await createStay(
        principal.supabase,
        trip_id,
        toStayInput(rest),
      );
      const stays = await loadStays(principal.supabase, trip_id);
      return { stay: stays.find((s) => s.id === stayId) ?? null };
    },
  );

  registerTool(
    server,
    "update_stay",
    {
      title: "Update a stay",
      description:
        "Change a stay's name, place, times or notes. Only the fields you pass are changed; the rest stay as they are.",
      inputSchema: z.object({
        stay_id: z.string().describe("The id of the stay to update."),
        ...stayFields,
      }),
      write: true,
    },
    async ({ stay_id, ...rest }, principal) => {
      const current = await loadStay(principal.supabase, stay_id);
      await updateStay(
        principal.supabase,
        stay_id,
        current.trip_id,
        mergeStayInput(current, rest),
      );
      const stays = await loadStays(principal.supabase, current.trip_id);
      return { stay: stays.find((s) => s.id === stay_id) ?? null };
    },
  );

  registerTool(
    server,
    "delete_stay",
    {
      title: "Delete a stay",
      description:
        "Remove a stay from a trip. Activities that referenced it stay, but lose the link.",
      inputSchema: z.object({
        stay_id: z.string().describe("The id of the stay to delete."),
      }),
      write: true,
    },
    async ({ stay_id }, principal) => {
      const tripId = await stayTripId(principal.supabase, stay_id);
      await deleteStay(principal.supabase, stay_id, tripId);
      return { deleted: true, stay_id };
    },
  );
}
