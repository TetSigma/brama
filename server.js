import express from "express";
import cors from "cors";
import ollama from "ollama";
import Database from "better-sqlite3";

const app = express();
app.use(cors());
app.use(express.json());

const BIELIK =
  "hf.co/speakleash/" +
  "Bielik-11B-v2.3-Instruct-GGUF:Q4_K_M";
const QWEN = "qwen2.5:7b";

const SYSTEM =
  "Jestes asystentem Urzedu Miasta " +
  "Lublin. Odpowiadaj po polsku, " +
  "rzeczowo i uprzejmie. Jesli nie " +
  "znasz odpowiedzi, powiedz to wprost.";

const LANG_NAMES = {
  en: "English",
  fr: "French",
  es: "Spanish",
  cs: "Czech",
  uk: "Ukrainian",
  ru: "Russian",
  de: "German",
};

const TR_SYS =
  "You are a professional translator " +
  "for a government office. " +
  "Translate the user's text into ";
const TR_TAIL =
  ". Preserve official terminology, " +
  "names and meaning exactly. " +
  "Do not add, omit, explain or " +
  "answer anything - " +
  "output only the translation.";

const MAX_MSGS = 20;

const db = new Database(
  "/opt/lublin-assistant/chats.db"
);
db.pragma("journal_mode = WAL");
db.exec(
  "CREATE TABLE IF NOT EXISTS messages (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "cid TEXT NOT NULL," +
    "role TEXT NOT NULL," +
    "content TEXT NOT NULL)"
);

const qInsert = db.prepare(
  "INSERT INTO messages " +
    "(cid, role, content) " +
    "VALUES (?, ?, ?)"
);
const qSelect = db.prepare(
  "SELECT role, content FROM messages " +
    "WHERE cid = ? " +
    "ORDER BY id DESC LIMIT ?"
);
const qDelete = db.prepare(
  "DELETE FROM messages WHERE cid = ?"
);

function history(id) {
  const rows = qSelect.all(id, MAX_MSGS);
  return rows.reverse();
}

function addMsg(id, role, content) {
  qInsert.run(id, role, content);
}

async function translate(text, target) {
  const sys = TR_SYS + target + TR_TAIL;
  const res = await ollama.chat({
    model: QWEN,
    stream: false,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: text },
    ],
  });
  return res.message.content;
}

async function complete(model, messages) {
  const res = await ollama.chat({
    model,
    messages,
    stream: false,
  });
  return res.message.content;
}

async function streamChat(res, model, messages) {
  let full = "";
  const stream = await ollama.chat({
    model,
    messages,
    stream: true,
  });
  for await (const part of stream) {
    const t = part.message?.content || "";
    if (t) {
      full += t;
      res.write(t);
    }
  }
  return full;
}

app.post("/api/chat", async (req, res) => {
  const body = req.body || {};
  const id = body.conversationId || "default";
  const lang = body.lang || "pl";
  const message = body.message || "";

  res.setHeader(
    "Content-Type",
    "text/plain; charset=utf-8"
  );

  // Store user input as Polish (canonical).
  const userPl =
    lang === "pl"
      ? message
      : await translate(message, "Polish");
  addMsg(id, "user", userPl);

  const bielikMsgs = [
    { role: "system", content: SYSTEM },
    ...history(id),
  ];

  // Polish: stream Bielik straight out.
  if (lang === "pl") {
    const answer =
      await streamChat(res, BIELIK, bielikMsgs);
    addMsg(id, "assistant", answer);
    return res.end();
  }

  // Other languages: full Polish answer,
  // then stream its translation.
  const answerPl =
    await complete(BIELIK, bielikMsgs);
  addMsg(id, "assistant", answerPl);

  const target = LANG_NAMES[lang] || lang;
  const outSys = TR_SYS + target + TR_TAIL;
  await streamChat(res, QWEN, [
    { role: "system", content: outSys },
    { role: "user", content: answerPl },
  ]);
  res.end();
});

// Clear one conversation.
app.post("/api/reset", (req, res) => {
  const body = req.body || {};
  const id = body.conversationId || "default";
  qDelete.run(id);
  res.json({ ok: true });
});

// Load a conversation (FE restore on reload).
app.get("/api/history/:id", (req, res) => {
  res.json(history(req.params.id));
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Assistant API on :3000");
});