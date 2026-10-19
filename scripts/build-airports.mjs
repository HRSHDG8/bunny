// Generates src/data/airports.json from two public data sets:
//  - OurAirports airports.csv: airport classification (large/medium only)
//  - OpenFlights airports.dat: IANA timezone per IATA code
// Usage: node scripts/build-airports.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUR_AIRPORTS = "https://ourairports.com/data/airports.csv";
const OPENFLIGHTS = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";

// Minimal RFC-4180 CSV parser (handles quoted fields with commas/quotes);
// OpenFlights uses \N for null.
function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

const [oaText, ofText] = await Promise.all([
  fetchText(OUR_AIRPORTS),
  fetchText(OPENFLIGHTS),
]);

// OurAirports: keep only large/medium airports with a 3-letter IATA code.
const oaRows = parseCsv(oaText);
const oaIdx = Object.fromEntries(oaRows[0].map((h, i) => [h, i]));
const largeMedium = new Map();
for (const row of oaRows.slice(1)) {
  const code = (row[oaIdx.iata_code] ?? "").trim();
  if (code.length !== 3) continue;
  const type = row[oaIdx.type] ?? "";
  const prev = largeMedium.get(code);
  if (!prev || (type === "large_airport" && prev !== "large_airport")) {
    largeMedium.set(code, type);
  }
}

// OpenFlights (positional columns):
// 0 id, 1 name, 2 city, 3 country, 4 iata, 5 icao, 6 lat, 7 lon, 8 alt,
// 9 dst, 10 tzdb_time_offset (deprecated), 11 tz (IANA), 12 type, 13 source
const ofRows = parseCsv(ofText);
const tzByIata = new Map();
for (const row of ofRows.slice(1)) {
  const code = (row[4] ?? "").trim();
  const tz = (row[11] ?? "").trim();
  if (code.length !== 3 || !tz || tz === "\\N") continue;
  if (!largeMedium.has(code)) continue;
  tzByIata.set(code, {
    city: (row[2] ?? "").trim() || null,
    tz,
  });
}

const airports = [...tzByIata.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, { city, tz }]) => ({ code, city, tz }));

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "data", "airports.json");
writeFileSync(out, JSON.stringify(airports) + "\n");
console.log(`Wrote ${airports.length} airports to ${out}`);
