import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "bunny - trip planning that feels like a postcard",
    short_name: "bunny",
    description:
      "Plan every day of your trip: flights, stays, rentals, and a day-by-day itinerary - all in one beautifully simple place.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f9f4ea",
    theme_color: "#c3552a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
