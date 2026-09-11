import { useMemo, useState } from "react";

interface Marker {
  lat: number;
  lng: number;
  title: string;
}

export function DayMap({ markers, title }: { markers: Marker[]; title: string }) {
  const [fallback, setFallback] = useState(false);

  const spots = useMemo(
    () =>
      markers.filter(
        (m) =>
          Number.isFinite(m.lat) &&
          Number.isFinite(m.lng) &&
          m.lat !== 0 &&
          m.lng !== 0,
      ),
    [markers],
  );

  const src = useMemo(() => {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    for (const s of spots) {
      minLat = Math.min(minLat, s.lat);
      maxLat = Math.max(maxLat, s.lat);
      minLon = Math.min(minLon, s.lng);
      maxLon = Math.max(maxLon, s.lng);
    }
    let pad = Math.max((maxLat - minLat) * 0.15, (maxLon - minLon) * 0.15, 0.01);
    if (spots.length === 1) pad = 0.02;
    minLat -= pad;
    maxLat += pad;
    minLon -= pad;
    maxLon += pad;
    const firstMarker = `${spots[0].lat.toFixed(5)},${spots[0].lng.toFixed(5)}`;
    const markersParam = spots
      .slice(1)
      .map((s) => `&marker=${s.lat.toFixed(5)},${s.lng.toFixed(5)}`)
      .join("");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon.toFixed(5)}%2C${minLat.toFixed(5)}%2C${maxLon.toFixed(5)}%2C${maxLat.toFixed(5)}&layer=mapnik&marker=${firstMarker}${markersParam}`;
  }, [spots]);

  if (spots.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="micro text-muted">{title}</p>
        <span className="text-[11px] font-semibold text-sea">
          {spots.length} {spots.length === 1 ? "marker" : "markers"}
        </span>
      </div>
      <div className="relative h-56 sm:h-64">
        {fallback ? (
          <div className="flex h-full items-center justify-center bg-cream/40 text-sm text-muted">
            Map preview unavailable — coordinates are saved.
          </div>
        ) : (
          <iframe
            title={title}
            src={src}
            className="h-full w-full"
            loading="lazy"
            onError={() => setFallback(true)}
          />
        )}
      </div>
    </div>
  );
}