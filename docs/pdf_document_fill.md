# PDF Document Intake + Conversational Fill

> Implements **D14** (`DECISIONS.md`): turn an attached official form (wniosek) into a ready-to-submit,
> pre-filled PDF. The citizen attaches a PDF in chat, the assistant explains how to fill it (grounded
> in the document text + BIP service info), then collects answers conversationally and returns a
> filled PDF. **No LLM is in the value path** — field values come only from validated user answers.

## User flow

1. **Attach** a PDF via the paperclip in the composer → `POST /api/documents/upload` parses it and
   returns `{ documentId, fields, hasFormFields, summary }`.
2. **Explain** — the next chat message (carrying `documentId`) runs in *explain mode*: the extracted
   document text + detected fields are injected into the system prompt alongside the usual RAG context
   (fees, office, attachments), and the assistant explains how to fill the form.
3. **Guided fill** — if the form has fillable fields, a *"Wypełnij ze mną"* CTA appears. Clicking it
   sends `action: 'fill:start'`, opening a server-side state machine that asks for one field per turn.
4. **Result** — once every field is answered, the backend fills the AcroForm with `pdf-lib`, flattens
   it, and emits a `downloadForm` answer block linking to `GET /api/documents/:id/download`.

```
attach ─▶ POST /api/documents/upload ─▶ { documentId, fields, hasFormFields }
chat + documentId ─▶ explain mode (doc text + RAG, refusal/cache bypassed)
fill:start ─▶ fill session ─▶ Q per field ─▶ answer per turn ─▶ … 
all answered ─▶ pdf-lib fill + flatten ─▶ SSE downloadForm block ─▶ /download
```

## Backend (`brama-be`)

| File | Role |
|---|---|
| `src/services/document.service.ts` | Parse (text via `pdf-parse`, AcroForm fields via `pdf-lib`), persist (SQLite + bytes on disk), fill-session CRUD, and deterministic `fillPdf`. |
| `src/routes/documents.ts` · `controllers/document.controller.ts` | `POST /api/documents/upload` (multer, memory storage), `GET /api/documents/:id/download`. |
| `src/schemas/document.schema.ts` | Upload body + download params. |
| `src/services/chat.service.ts` | Turn dispatcher: fill action → active fill session → document explain → normal chat. |
| `src/schemas/chat.schema.ts` | Adds optional `documentId` and `action` (`fill:start` / `fill:cancel`). |
| `scripts/build-templates.ts` | Generates the demo fillable template (`npm run build:templates`). |

### Parsing & storage
- `pdf-parse@2` extracts the **text layer** (used for the explanation). `pdf-lib` enumerates AcroForm
  fields, normalised to `{ name, type: text|checkbox|radio|dropdown|optionList, options?, required }`.
- Metadata lives in a dedicated SQLite DB (`documents.db`); the original bytes and the filled output
  live under `DOCUMENTS_DIR/<id>/`. A `fill_sessions` table holds one active questionnaire per
  conversation (`current_index`, `answers_json`, `status`).
- **Scanned PDFs** (no text layer) are rejected at upload with `422` — OCR is a future enhancement.

### Chat dispatch (`handleChat`)
Order matters: `fill:cancel` → `fill:start` → active fill session → attached `documentId` (explain) →
normal chat. When a `documentId` is present, the turn **bypasses the scope-guard refusal and the
response cache** (the attached document is itself the in-scope context). Normal RAG chat is unchanged
(extracted verbatim into `handleNormalChat`).

### Conversational fill (deterministic state machine)
- One field per turn; the question is a template (`Podaj: <label>.`, with options for choice fields,
  `tak/nie` for checkboxes), translated into the user's language via the existing `qwen` path.
- Each user message is stored verbatim as the current field's value — the LLM never fabricates values.
- On completion, `fillPdf` sets each field by type and calls `form.updateFieldAppearances(font)` +
  `form.flatten()`.

### Polish text rendering
pdf-lib's built-in fonts are WinAnsi and can't encode `ł/ś/ż/ć/ą/ę`. A bundled Unicode TTF
(`assets/fonts/DejaVuSans.ttf`) is embedded into every filled PDF and used for field appearances, so
values like `Łukasz Wałęsa` render correctly.

### Demo templates (`assets/templates/`)
The real Lublin forms (e.g. *Upoważnienie do odbioru zaświadczenia*) are **flat, print-only PDFs with
no fillable fields**. Per D14's sanctioned fallback, `build-templates.ts` recreates one as a proper
7-field AcroForm we control (`upowaznienie-odbior-zaswiadczenia.pdf`). A real flat form
(`przyklad-zaswiadczenie-o-dochodach.pdf`) is kept as an explain-flow example.

### New env vars (`.env.example`)
`DOCUMENTS_DIR` · `DOCUMENTS_DATABASE_PATH` · `MAX_UPLOAD_MB` (default 10) ·
`DOCUMENT_CONTEXT_CHARS` (cap on injected document text, sized to `OLLAMA_NUM_CTX`).

## Frontend (`brama-web`)

| File | Change |
|---|---|
| `src/api/documentsClient.ts` | `uploadDocument(file, conversationId)` → multipart upload. |
| `src/contexts/chatSessionStore.ts` | `attachedDocument` slice (`set`/`clear`). |
| `src/components/ChatComposer.tsx` | Paperclip + hidden file input, attached-file chip, "Wypełnij ze mną" CTA. |
| `src/hooks/useChat.ts` | Sends `documentId` on each turn; adds `startFill()` / `cancelFill()` (silent control turns). |
| `src/@types/chat.ts` · `src/api/chatClient.ts` | `documentId` + `action` added to `SendChatInput` and forwarded in the request body. |
| `src/localization/resources.ts` | `chat.document.*` keys (en + pl; other locales fall back to en). |

The `downloadForm` answer block (already in `api/blocks.ts` / `components/blocks/DownloadFormBlock.tsx`)
renders the filled-PDF download — no new block code was needed.

## Protocol note (SSE)
Normal chat continues to stream `text/plain`. Only turns that carry structured output (the
fill-completion turn) switch to **SSE** so they can attach a `blocks` frame — the frontend client
already handles both plain-text chunks and `event:`/`data:` SSE frames. Every SSE frame, including the
terminal `done`, ends with `\n\n`.

## Verification
Deterministic paths verified end-to-end (no LLM required):
- Upload → 7 sequential field questions → SSE `downloadForm` completion block.
- `GET /download` serves `application/pdf` with all Polish-diacritic values embedded.
- `fill:cancel` mid-session; flat PDF → graceful "no fillable fields" decline; scanned PDF → 422.

Build the template and exercise the loop:
```bash
cd brama-be
npm run build:templates
npm run dev   # POST /api/documents/upload, then /api/chat with the returned documentId
```
LLM-dependent paths (explanation prose, translated questions, normal-chat regression) reuse existing
generation code and should be confirmed with Ollama running.

## Limitations / follow-ups
- **No OCR** — scanned/image-only PDFs are rejected.
- **No auto-submit** — output is a downloadable PDF the citizen reviews before submitting.
- Fill questions are templated (then translated); LLM-phrased questions are a possible enhancement.
- While a fill session is active, every message is treated as the current field's answer (use the
  cancel control to exit).
