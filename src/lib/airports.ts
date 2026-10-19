import airportsData from "@/data/airports.json";

export interface Airport {
  code: string;
  city: string | null;
  tz: string;
}

const airports = airportsData as Airport[];

const byCode = new Map<string, Airport>(
  airports.map((a) => [a.code.toUpperCase(), a]),
);

export function airportForCode(code: string): Airport | null {
  const key = code.trim().toUpperCase();
  if (key.length !== 3) return null;
  return byCode.get(key) ?? null;
}

export function timezoneForCode(code: string): string | null {
  return airportForCode(code)?.tz ?? null;
}

/** Short IANA-free zone label for display, e.g. "GMT+1" / "CEST". */
export function zoneLabel(tz: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(at);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Format a duration in ms as e.g. "2h 50m". */
export function fmtDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  const sign = mins < 0 ? "-" : "";
  return m > 0 ? `${sign}${h}h ${m}m` : `${sign}${h}h`;
}

export { airports as airportList };
