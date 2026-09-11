import { NextRequest, NextResponse } from "next/server";
import type { PlaceResult } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] as PlaceResult[] });
  }

  const params = new URLSearchParams({ q, limit: "8", lang: "en" });
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  if (lat) params.set("lat", lat);
  if (lon) params.set("lon", lon);

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

    // Deduplicate by name+lat+lon
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      const key = `${r.name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ results: unique });
  } catch {
    return NextResponse.json({ results: [] as PlaceResult[] });
  }
}