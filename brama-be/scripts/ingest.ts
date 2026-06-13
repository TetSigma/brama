import { QdrantClient } from "@qdrant/js-client-rest";
import Database from "better-sqlite3";
import { createReadStream, readFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../docs/bip_db");
const DB_PATH = path.resolve(__dirname, "../data/brama.db");

const VECTOR_SIZE = 1024;
const BATCH_SIZE = 20;

// --- types ---

interface ServiceRecord {
  id: string;
  nazwa: string;
  komorka: string;
  obszar: string;
  url: string;
  text: string;
}

interface DepartmentRecord {
  nazwa: string;
  url: string;
  departament_slug: string;
  is_departament: boolean;
  kierownik?: string;
  symbol?: string;
  departament?: string;
  adres?: string;
  telefon?: string;
  faks?: string;
  email?: string;
  sekcje?: Record<string, string>;
}

// --- helpers ---

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.OLLAMA_EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed failed: ${res.status}`);
  const data = (await res.json()) as { embeddings: number[][] };
  const vec = data.embeddings[0];
  if (!vec) throw new Error("Empty embedding returned");
  return vec;
}

async function* readJsonl<T>(filePath: string): AsyncGenerator<T> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed) as T;
  }
}

function slugFromUrl(url: string): string {
  const parts = url.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] ?? url;
}

// --- services → Qdrant ---

async function ingestServices(qdrant: QdrantClient): Promise<void> {
  console.log("→ Creating Qdrant collection...");

  try {
    await qdrant.deleteCollection(env.QDRANT_COLLECTION);
  } catch {
    // collection may not exist on first run
  }

  await qdrant.createCollection(env.QDRANT_COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });

  await qdrant.createPayloadIndex(env.QDRANT_COLLECTION, {
    field_name: "komorka",
    field_schema: "keyword",
  });

  console.log("→ Embedding services (this takes ~2–3 min)...");

  const batch: Array<{
    id: number;
    vector: number[];
    payload: Record<string, unknown>;
  }> = [];
  let count = 0;

  for await (const svc of readJsonl<ServiceRecord>(
    `${DATA_DIR}/services.jsonl`,
  )) {
    const vector = await embed(svc.text);

    batch.push({
      id: count + 1,
      vector,
      payload: {
        card_id: svc.id,
        nazwa: svc.nazwa,
        komorka: svc.komorka,
        obszar: svc.obszar,
        url: svc.url,
      },
    });
    count++;

    if (batch.length >= BATCH_SIZE) {
      await qdrant.upsert(env.QDRANT_COLLECTION, {
        wait: true,
        points: batch.splice(0),
      });
    }

    process.stdout.write(`\r  ${count} / 389 embedded`);
  }

  if (batch.length > 0) {
    await qdrant.upsert(env.QDRANT_COLLECTION, { wait: true, points: batch });
  }

  console.log(`\n✓ ${count} services stored in Qdrant`);
}

// --- departments → SQLite ---

function ingestDepartments(db: Database.Database): void {
  console.log("→ Setting up departments in SQLite...");

  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      slug           TEXT PRIMARY KEY,
      nazwa          TEXT NOT NULL,
      departament_slug TEXT,
      is_departament INTEGER NOT NULL DEFAULT 0,
      kierownik      TEXT,
      symbol         TEXT,
      departament    TEXT,
      adres          TEXT,
      telefon        TEXT,
      faks           TEXT,
      email          TEXT,
      url            TEXT,
      godziny_pracy  TEXT,
      zakres_dzialania TEXT
    )
  `);

  const raw = readFileSync(`${DATA_DIR}/departments.jsonl`, "utf-8");
  const records: DepartmentRecord[] = raw
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as DepartmentRecord);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO departments
      (slug, nazwa, departament_slug, is_departament, kierownik, symbol,
       departament, adres, telefon, faks, email, url, godziny_pracy, zakres_dzialania)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction((rows: DepartmentRecord[]) => {
    for (const r of rows) {
      insert.run(
        slugFromUrl(r.url),
        r.nazwa,
        r.departament_slug ?? null,
        r.is_departament ? 1 : 0,
        r.kierownik ?? null,
        r.symbol ?? null,
        r.departament ?? null,
        r.adres ?? null,
        r.telefon ?? null,
        r.faks ?? null,
        r.email ?? null,
        r.url,
        r.sekcje?.["Godziny pracy"] ?? null,
        r.sekcje?.["Zakres działania"] ?? null,
      );
    }
  });

  insertAll(records);
  console.log(`✓ ${records.length} departments stored in SQLite`);
}

// --- main ---

async function main(): Promise<void> {
  mkdirSync(path.resolve(__dirname, "../data"), { recursive: true });

  const qdrant = new QdrantClient({ url: env.QDRANT_URL });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    await ingestServices(qdrant);
    ingestDepartments(db);
    console.log("\nDone. Qdrant + SQLite ready.");
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
