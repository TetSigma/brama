import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/config/env.js";

// Standalone geocoder: adds lat/lng to the existing departments table in
// brama.db without touching Qdrant. Run AFTER `npm run ingest` (which rebuilds
// the table). Re-running ingest nulls the coords, so re-run this afterwards.
//
//   npm run geocode            # geocode only rows missing coords
//   npm run geocode -- --force # re-geocode every row with an address

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../data/brama.db");

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
// Lublin addresses are stored bare (e.g. "ul. Filaretów 44"); bias the lookup to
// the city + country so the geocoder resolves the right place.
const ADDRESS_SUFFIX = ", Lublin, Polska";
// Be polite to the API; geocoding ~hundreds of rows once is not latency-bound.
const DELAY_MS = 120;

type DepartmentRow = { slug: string; nazwa: string; adres: string | null };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(
    address + ADDRESS_SUFFIX,
  )}&region=pl&key=${env.GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  const json = (await response.json()) as {
    status: string;
    results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    error_message?: string;
  };

  if (json.status === "OK") {
    const location = json.results?.[0]?.geometry?.location;
    if (location) {
      return { lat: location.lat, lng: location.lng };
    }
  }

  if (json.status !== "ZERO_RESULTS") {
    console.error(`  geocode status=${json.status} ${json.error_message ?? ""}`.trim());
  }
  return null;
}

function ensureCoordColumns(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(departments)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "lat")) {
    db.exec("ALTER TABLE departments ADD COLUMN lat REAL");
  }
  if (!columns.some((column) => column.name === "lng")) {
    db.exec("ALTER TABLE departments ADD COLUMN lng REAL");
  }
}

async function main(): Promise<void> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY is not set; cannot geocode.");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    ensureCoordColumns(db);

    const where = force
      ? "adres IS NOT NULL AND adres != ''"
      : "adres IS NOT NULL AND adres != '' AND (lat IS NULL OR lng IS NULL)";
    const rows = db
      .prepare(`SELECT slug, nazwa, adres FROM departments WHERE ${where}`)
      .all() as DepartmentRow[];

    if (rows.length === 0) {
      console.log("Nothing to geocode (all departments with an address already have coords).");
      return;
    }

    console.log(`→ Geocoding ${rows.length} departments...`);
    const update = db.prepare("UPDATE departments SET lat = ?, lng = ? WHERE slug = ?");

    let ok = 0;
    let failed = 0;
    for (const row of rows) {
      const coords = await geocode(row.adres as string);
      if (coords) {
        update.run(coords.lat, coords.lng, row.slug);
        ok++;
      } else {
        failed++;
        console.error(`  ✗ ${row.nazwa} — ${row.adres}`);
      }
      await sleep(DELAY_MS);
    }

    console.log(`✓ Geocoded ${ok}/${rows.length} (${failed} failed).`);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
