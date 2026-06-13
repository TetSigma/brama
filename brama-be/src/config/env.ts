import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CHAT_DATABASE_PATH: z.string().default("./data/chats.db"),
  DEPARTMENTS_DATABASE_PATH: z.string().default("./data/brama.db"),
  OLLAMA_CHAT_MODEL: z
    .string()
    .default("SpeakLeash/bielik-4.5b-v3.0-instruct:Q8_0"),
  OLLAMA_TRANSLATION_MODEL: z.string().default("qwen2.5:7b"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_EMBED_MODEL: z.string().default("bge-m3:latest"),
  OLLAMA_NUM_CTX: z.coerce.number().int().positive().default(8192),
  LIFE_EVENTS_PATH: z.string().default("../docs/bip_db/life_events.json"),
  LIFE_EVENT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.55),
  DEADLINES_SEED_PATH: z
    .string()
    .default("../docs/bip_db/life_event_deadlines.json"),
  DEADLINE_LLM_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  // Parsed BIP data dir (relative to brama-be cwd); services.json feeds the
  // in-memory content-block bundle source.
  BIP_DATA_DIR: z.string().default("../docs/bip_db"),
  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_COLLECTION: z.string().default("bip_services"),
  RAG_TOP_K: z.coerce.number().int().positive().default(4),
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.45),
  RAG_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  NEO4J_URI: z.string().default("bolt://localhost:7687"),
  NEO4J_USER: z.string().default("neo4j"),
  NEO4J_PASSWORD: z.string().default("password"),
  GRAPH_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  MAPS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DOCUMENTS_DIR: z.string().default("./data/documents"),
  DOCUMENTS_DATABASE_PATH: z.string().default("./data/documents.db"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
  DOCUMENT_CONTEXT_CHARS: z.coerce.number().int().positive().default(6000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment configuration",
    z.treeifyError(parsedEnv.error),
  );
  process.exit(1);
}

export const env = parsedEnv.data;
