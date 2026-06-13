import neo4j, { type Driver, type Session } from "neo4j-driver";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../docs/bip_db");

// --- types ---

interface ServiceRecord {
  numer_karty?: string;
  nazwa?: string;
  komorka?: string;
  url?: string;
}

interface DepartmentRecord {
  nazwa?: string;
  symbol?: string;
  departament?: string;
  is_departament?: boolean;
  adres?: string;
  telefon?: string;
  email?: string;
  sekcje?: Record<string, string>;
}

interface Producer {
  id: string;
  primary?: boolean;
}

interface InternalDependency {
  document?: string;
  produced_by?: Producer[];
}

interface ExternalDependency {
  office?: string;
  label?: string;
}

interface DependencyRecord {
  id: string;
  requires_internal_service?: InternalDependency[];
  requires_external_doc?: ExternalDependency[];
}

interface DependencyFile {
  services: DependencyRecord[];
}

// --- helpers ---

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf-8")) as T;
}

async function run(
  session: Session,
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  await session.run(cypher, params);
}

// --- node loaders ---

async function loadServices(session: Session): Promise<number> {
  const services = readJson<ServiceRecord[]>("services.json");
  const rows = services
    .filter((svc) => svc.numer_karty)
    .map((svc) => ({
      card_id: svc.numer_karty,
      nazwa: svc.nazwa ?? "",
      komorka: svc.komorka ?? "",
      url: svc.url ?? "",
    }));

  await run(
    session,
    `UNWIND $rows AS row
     MERGE (s:Service { card_id: row.card_id })
     SET s.nazwa = row.nazwa, s.komorka = row.komorka, s.url = row.url`,
    { rows },
  );

  return rows.length;
}

async function loadOffices(session: Session): Promise<number> {
  const departments = readJson<DepartmentRecord[]>("departments.json");
  const rows = departments
    .filter((dept) => !dept.is_departament && dept.symbol)
    .map((dept) => ({
      symbol: dept.symbol,
      nazwa: dept.nazwa ?? "",
      adres: dept.adres ?? null,
      telefon: dept.telefon ?? null,
      email: dept.email ?? null,
      departament: dept.departament ?? null,
      hours: dept.sekcje?.["Godziny pracy"] ?? null,
    }));

  await run(
    session,
    `UNWIND $rows AS row
     MERGE (o:Office { symbol: row.symbol })
     SET o.nazwa = row.nazwa, o.adres = row.adres, o.telefon = row.telefon,
         o.email = row.email, o.departament = row.departament, o.hours = row.hours`,
    { rows },
  );

  // HANDLED_BY: card prefix (e.g. KM-022 -> KM) matches the office symbol.
  await run(
    session,
    `MATCH (s:Service)
     WITH s, split(s.card_id, '-')[0] AS sym
     MATCH (o:Office { symbol: sym })
     MERGE (s)-[:HANDLED_BY]->(o)`,
  );

  return rows.length;
}

async function loadDependencies(session: Session): Promise<{ prior: number; external: number }> {
  const { services } = readJson<DependencyFile>("dependencies.json");

  const priorEdges: Array<{ from: string; to: string; document: string }> = [];
  const externalEdges: Array<{ from: string; code: string; label: string }> = [];

  for (const svc of services) {
    for (const dependency of svc.requires_internal_service ?? []) {
      const producers = dependency.produced_by ?? [];
      const producer = producers.find((entry) => entry.primary) ?? producers[0];
      if (producer && producer.id !== svc.id) {
        priorEdges.push({
          from: svc.id,
          to: producer.id,
          document: dependency.document ?? "",
        });
      }
    }

    for (const external of svc.requires_external_doc ?? []) {
      if (external.office) {
        externalEdges.push({
          from: svc.id,
          code: external.office,
          label: external.label ?? external.office,
        });
      }
    }
  }

  await run(
    session,
    `UNWIND $edges AS e
     MATCH (a:Service { card_id: e.from })
     MATCH (b:Service { card_id: e.to })
     MERGE (a)-[r:REQUIRES_PRIOR]->(b)
     SET r.document = e.document`,
    { edges: priorEdges },
  );

  await run(
    session,
    `UNWIND $edges AS e
     MERGE (x:ExternalOffice { code: e.code })
     SET x.label = e.label
     WITH e, x
     MATCH (a:Service { card_id: e.from })
     MERGE (a)-[:REQUIRES_EXTERNAL]->(x)`,
    { edges: externalEdges },
  );

  return { prior: priorEdges.length, external: externalEdges.length };
}

// --- main ---

async function setupConstraints(session: Session): Promise<void> {
  await run(
    session,
    "CREATE CONSTRAINT service_card_id IF NOT EXISTS FOR (s:Service) REQUIRE s.card_id IS UNIQUE",
  );
  await run(
    session,
    "CREATE CONSTRAINT office_symbol IF NOT EXISTS FOR (o:Office) REQUIRE o.symbol IS UNIQUE",
  );
  await run(
    session,
    "CREATE CONSTRAINT external_code IF NOT EXISTS FOR (x:ExternalOffice) REQUIRE x.code IS UNIQUE",
  );
}

async function resetGraph(session: Session): Promise<void> {
  await run(
    session,
    `MATCH (n)
     WHERE n:Service OR n:Office OR n:ExternalOffice OR n:LifeEvent
     DETACH DELETE n`,
  );
}

async function main(): Promise<void> {
  const driver: Driver = neo4j.driver(
    env.NEO4J_URI,
    neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD),
  );
  const session = driver.session();

  try {
    console.log("→ Setting up constraints...");
    await setupConstraints(session);

    console.log("→ Resetting graph...");
    await resetGraph(session);

    const services = await loadServices(session);
    console.log(`✓ ${services} Service nodes`);

    const offices = await loadOffices(session);
    console.log(`✓ ${offices} Office nodes + HANDLED_BY edges`);

    const { prior, external } = await loadDependencies(session);
    console.log(`✓ ${prior} REQUIRES_PRIOR + ${external} REQUIRES_EXTERNAL edges`);

    console.log("\nDone. Neo4j service dependency graph ready.");
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
