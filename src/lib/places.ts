import type { PlaceResult } from "@/lib/types";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_type?: string;
    osm_id?: number;
    type?: string;
  };
}

/**
 * Geocoder lookup, shared by the search box in the app and the MCP
 * `search_places` tool. Returns an empty list when the geocoder is
 * unreachable rather than throwing.
 */
export async function searchPlaces(
  query: string,
  options: { lat?: number; lon?: number; limit?: number } = {},
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    limit: String(options.limit ?? 8),
    lang: "en",
  });
  if (typeof options.lat === "number")
    params.set("lat", String(options.lat));
  if (typeof options.lon === "number")
    params.set("lon", String(options.lon));

  try {
    const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: { "User-Agent": "bunny-trip-planner/1.0 (trip planning app)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Photon returned ${response.status}`);

    const data = (await response.json()) as { features?: PhotonFeature[] };
    const results: PlaceResult[] = (data.features ?? [])
      .filter((f) => f.properties.name)
      .map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        const { properties: p } = f;
        const bits = [p.name, p.type === "city" ? undefined : p.city, p.state, p.country]
          .filter(Boolean);
        return {
          name: p.name!,
          address: bits.slice(1).join(", ") || p.city || p.country || "",
          lat,
          lon,
          osm_type: p.osm_type,
          osm_id: p.osm_id,
        };
      });

    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}
