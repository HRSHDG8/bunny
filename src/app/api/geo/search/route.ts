import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  const results = await searchPlaces(q, {
    lat: lat ? Number(lat) : undefined,
    lon: lon ? Number(lon) : undefined,
  });

  return NextResponse.json({ results });
}
