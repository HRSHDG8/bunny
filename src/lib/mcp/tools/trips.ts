import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { apiError } from "@/lib/supabase/errors";
import {
  createTrip,
  deleteTrip,
  enableTripSharing,
  revokeTripSharing,
  setTripSharingEmails,
  updateTrip,
  type TripInput,
} from "@/lib/services/trips";
import { registerTool, dateString, merged } from "@/lib/mcp/tools/shared";
import {
  loadFlights,
  loadItinerary,
  loadPeople,
  loadRentals,
  loadTrip,
  tripSummary,
} from "@/lib/mcp/tools/queries";

const tripFields = {
  title: z.string().describe("The name of the trip, e.g. 'Lisbon long weekend'."),
  destination: z.string().describe("Where the trip goes, e.g. 'Lisbon, Portugal'."),
  start_date: dateString.describe("First day of the trip (YYYY-MM-DD)."),
  end_date: dateString.describe("Last day of the trip (YYYY-MM-DD)."),
  arrival_method: z
    .enum(["flight", "train", "drive", "cruise", "other"])
    .describe("How the travellers get there.")
    .optional(),
  arrival_notes: z
    .string()
    .describe("Extra details about arriving, e.g. 'arrive at 22:40, airport express'.")
    .optional(),
};

/** Update tools take only the fields being changed; the rest stay as they are. */
const updateTripFields = {
  title: tripFields.title.optional(),
  destination: tripFields.destination.optional(),
  start_date: tripFields.start_date.optional(),
  end_date: tripFields.end_date.optional(),
  arrival_method: tripFields.arrival_method,
  arrival_notes: tripFields.arrival_notes,
};

export function registerTripTools(server: McpServer) {
  registerTool(
    server,
    "list_trips",
    {
      title: "List trips",
      description:
        "List every trip the signed-in bunny user owns or has joined, with dates, destination and whether it's finished.",
      inputSchema: z.object({}),
    },
    async (_args, principal) => {
      const { data, error } = await principal.supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw apiError("Couldn't load your trips.", error);
      return { trips: (data ?? []).map(tripSummary) };
    },
  );

  registerTool(
    server,
    "get_trip",
    {
      title: "Get a trip",
      description:
        "Load one trip in full: the trip itself, its flights, car rental, day-by-day itinerary, who's coming, and the invite link.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
      }),
    },
    async ({ trip_id }, principal) => {
      const trip = await loadTrip(principal.supabase, trip_id);
      const [flights, rentals, itinerary, people] = await Promise.all([
        loadFlights(principal.supabase, trip_id),
        loadRentals(principal.supabase, trip_id),
        loadItinerary(principal.supabase, trip_id),
        loadPeople(principal.supabase, trip_id),
      ]);
      return {
        trip: tripSummary(trip),
        flights,
        rentals,
        itinerary,
        people,
      };
    },
  );

  registerTool(
    server,
    "create_trip",
    {
      title: "Create a trip",
      description:
        "Create a new trip. The user can have up to 5 active trips at once, and a trip locks once its end date has passed.",
      inputSchema: z.object(tripFields),
      write: true,
    },
    async (args, principal) => {
      const input: TripInput = {
        title: args.title,
        destination: args.destination,
        start_date: args.start_date,
        end_date: args.end_date,
        arrival_method: args.arrival_method ?? "",
        arrival_notes: args.arrival_notes ?? "",
      };
      const tripId = await createTrip(principal.supabase, principal.userId, input);
      const trip = await loadTrip(principal.supabase, tripId);
      return { trip: tripSummary(trip) };
    },
  );

  registerTool(
    server,
    "update_trip",
    {
      title: "Update a trip",
      description:
        "Change a trip's name, destination, dates or arrival details. Only the fields you pass are changed; the rest are left alone. Completed trips can't be changed.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip to update."),
        ...updateTripFields,
      }),
      write: true,
    },
    async ({ trip_id, ...rest }, principal) => {
      const current = await loadTrip(principal.supabase, trip_id);
      const input: TripInput = {
        title: merged(rest.title, current.title, ""),
        destination: merged(rest.destination, current.destination, ""),
        start_date: merged(rest.start_date, current.start_date, ""),
        end_date: merged(rest.end_date, current.end_date, ""),
        arrival_method: merged(rest.arrival_method, current.arrival_method, ""),
        arrival_notes: merged(rest.arrival_notes, current.arrival_notes, ""),
      };
      await updateTrip(principal.supabase, trip_id, input);
      const trip = await loadTrip(principal.supabase, trip_id);
      return { trip: tripSummary(trip) };
    },
  );

  registerTool(
    server,
    "delete_trip",
    {
      title: "Delete a trip",
      description:
        "Delete a trip and everything in it. Only the trip owner can do this.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip to delete."),
      }),
      write: true,
    },
    async ({ trip_id }, principal) => {
      await deleteTrip(principal.supabase, trip_id);
      return { deleted: true, trip_id };
    },
  );

  registerTool(
    server,
    "manage_trip_sharing",
    {
      title: "Manage trip invites",
      description:
        "Control who can join a trip with the invite link. Use 'enable' to switch sharing on, 'disable' to switch it off, and 'set_emails' to restrict the link to a guest list of email addresses.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
        action: z
          .enum(["enable", "disable", "set_emails"])
          .describe("What to do with the invite link."),
        emails: z
          .string()
          .describe(
            "Comma-separated email addresses, for the 'set_emails' action. Leave empty to let anyone with the link join.",
          )
          .optional(),
      }),
      write: true,
    },
    async ({ trip_id, action, emails }, principal) => {
      if (action === "enable")
        await enableTripSharing(principal.supabase, trip_id, principal.userId);
      else if (action === "disable")
        await revokeTripSharing(principal.supabase, trip_id, principal.userId);
      else
        await setTripSharingEmails(
          principal.supabase,
          trip_id,
          principal.userId,
          emails ?? "",
        );

      const trip = await loadTrip(principal.supabase, trip_id);
      return { trip: tripSummary(trip) };
    },
  );

  registerTool(
    server,
    "list_trip_people",
    {
      title: "List who's on a trip",
      description:
        "List the people on a trip with their names, emails and user ids, so flights and rentals can be assigned to them.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
      }),
    },
    async ({ trip_id }, principal) => {
      const people = await loadPeople(principal.supabase, trip_id);
      return { trip_id, people };
    },
  );
}
