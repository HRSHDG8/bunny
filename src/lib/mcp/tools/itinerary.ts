import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  createItineraryItem,
  deleteItineraryItem,
  moveItineraryItem,
  updateItineraryItem,
  type ItineraryInput,
} from "@/lib/services/itinerary";
import { apiError } from "@/lib/supabase/errors";
import { registerTool, merged, timeString } from "@/lib/mcp/tools/shared";
import { loadItinerary, loadItineraryItem } from "@/lib/mcp/tools/queries";
import type { ItineraryItem } from "@/lib/types";

const itemFields = {
  day_number: z
    .number()
    .int()
    .min(1)
    .describe("Which day of the trip this belongs to, starting at 1."),
  title: z.string().describe("What the activity is, e.g. 'Dinner at Time Out Market'."),
  place_name: z
    .string()
    .describe("Where it happens, e.g. 'Time Out Market, Lisbon'.")
    .optional(),
  lat: z.number().describe("Latitude of the place.").optional(),
  lng: z.number().describe("Longitude of the place.").optional(),
  start_time: timeString.describe("Start time (HH:MM).").optional(),
  end_time: timeString.describe("End time (HH:MM).").optional(),
  notes: z.string().describe("Any extra detail about the activity.").optional(),
};

/** Update tools take only the fields being changed; the rest stay as they are. */
const updateItemFields = {
  ...itemFields,
  day_number: itemFields.day_number.optional(),
  title: itemFields.title.optional(),
};

function toItemInput(args: Record<string, unknown>): ItineraryInput {
  return {
    day_number: args.day_number as number,
    title: (args.title as string) ?? "",
    place_name: (args.place_name as string) ?? "",
    lat: (args.lat as number) ?? null,
    lng: (args.lng as number) ?? null,
    start_time: (args.start_time as string) ?? "",
    end_time: (args.end_time as string) ?? "",
    notes: (args.notes as string) ?? "",
  };
}

/** Keep whatever the caller didn't mention, so a partial edit stays partial. */
function mergeItemInput(
  current: ItineraryItem,
  args: Record<string, unknown>,
): ItineraryInput {
  const text = (key: string, fallback: string | null) =>
    merged(args[key] as string | undefined, fallback, "");
  return {
    day_number:
      args.day_number === undefined
        ? current.day_number
        : (args.day_number as number),
    title: text("title", current.title),
    place_name: text("place_name", current.place_name),
    lat:
      args.lat === undefined ? current.lat : ((args.lat as number) ?? null),
    lng:
      args.lng === undefined ? current.lng : ((args.lng as number) ?? null),
    start_time: text("start_time", current.start_time),
    end_time: text("end_time", current.end_time),
    notes: text("notes", current.notes),
  };
}

async function itemTripId(
  supabase: Parameters<typeof loadItinerary>[0],
  itemId: string,
) {
  const { data, error } = await supabase
    .from("itinerary_items")
    .select("trip_id")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the activity.", error);
  if (!data)
    throw new Error("That activity doesn't exist, or you don't have access to it.");
  return data.trip_id as string;
}

export function registerItineraryTools(server: McpServer) {
  registerTool(
    server,
    "list_itinerary",
    {
      title: "List the itinerary",
      description:
        "List a trip's day-by-day itinerary, in the order bunny shows it.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
      }),
    },
    async ({ trip_id }, principal) => {
      const itinerary = await loadItinerary(principal.supabase, trip_id);
      return { trip_id, itinerary };
    },
  );

  registerTool(
    server,
    "add_itinerary_item",
    {
      title: "Add an activity",
      description:
        "Add an activity to a day of the trip. New activities go to the end of that day.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
        ...itemFields,
      }),
      write: true,
    },
    async ({ trip_id, ...rest }, principal) => {
      const itemId = await createItineraryItem(
        principal.supabase,
        trip_id,
        toItemInput(rest),
      );
      const itinerary = await loadItinerary(principal.supabase, trip_id);
      return { item: itinerary.find((i) => i.id === itemId) ?? null };
    },
  );

  registerTool(
    server,
    "update_itinerary_item",
    {
      title: "Update an activity",
      description:
        "Change an activity's day, time, place or notes. Only the fields you pass are changed; the rest stay as they are.",
      inputSchema: z.object({
        item_id: z.string().describe("The id of the activity to update."),
        ...updateItemFields,
      }),
      write: true,
    },
    async ({ item_id, ...rest }, principal) => {
      const current = await loadItineraryItem(principal.supabase, item_id);
      await updateItineraryItem(
        principal.supabase,
        item_id,
        current.trip_id,
        mergeItemInput(current, rest),
      );
      const itinerary = await loadItinerary(principal.supabase, current.trip_id);
      return { item: itinerary.find((i) => i.id === item_id) ?? null };
    },
  );

  registerTool(
    server,
    "remove_itinerary_item",
    {
      title: "Remove an activity",
      description: "Remove an activity from the itinerary.",
      inputSchema: z.object({
        item_id: z.string().describe("The id of the activity to remove."),
      }),
      write: true,
    },
    async ({ item_id }, principal) => {
      const tripId = await itemTripId(principal.supabase, item_id);
      await deleteItineraryItem(principal.supabase, item_id, tripId);
      return { deleted: true, item_id };
    },
  );

  registerTool(
    server,
    "move_itinerary_item",
    {
      title: "Reorder an activity",
      description: "Move an activity one place earlier or later in its day.",
      inputSchema: z.object({
        item_id: z.string().describe("The id of the activity to move."),
        direction: z.enum(["up", "down"]).describe("Which way to move it."),
      }),
      write: true,
    },
    async ({ item_id, direction }, principal) => {
      const tripId = await itemTripId(principal.supabase, item_id);
      await moveItineraryItem(principal.supabase, item_id, tripId, direction);
      const itinerary = await loadItinerary(principal.supabase, tripId);
      return { item: itinerary.find((i) => i.id === item_id) ?? null };
    },
  );
}
