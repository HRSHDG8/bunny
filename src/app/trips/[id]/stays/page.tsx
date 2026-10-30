import { getStays, getTrip, isTripCompleted } from "@/lib/data";
import { StaysManager } from "@/components/stay/stays-manager";

export const metadata = { title: "Stays" };

export default async function StaysPage(
  props: PageProps<"/trips/[id]/stays">,
) {
  const { id } = await props.params;
  const [stays, trip] = await Promise.all([getStays(id), getTrip(id)]);
  return (
    <StaysManager
      tripId={id}
      stays={stays}
      locked={isTripCompleted(trip)}
    />
  );
}
