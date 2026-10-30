import { getItinerary, getStays, getTrip, isTripCompleted, tripDays } from "@/lib/data";
import { DayPlanner } from "@/components/itinerary/day-planner";

export const metadata = { title: "Itinerary" };

export default async function ItineraryPage(
  props: PageProps<"/trips/[id]/itinerary">,
) {
  const { id } = await props.params;
  const [trip, items, stays] = await Promise.all([
    getTrip(id),
    getItinerary(id),
    getStays(id),
  ]);

  const days = tripDays(trip).map((d) => ({
    dayNumber: d.dayNumber,
    date: d.date,
    label: d.label,
  }));

  return (
    <DayPlanner
      tripId={id}
      days={days}
      items={items}
      stays={stays}
      locked={isTripCompleted(trip)}
    />
  );
}