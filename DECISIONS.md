# Architecture Decisions — City Authority AI Assistant

Final statements resolving the open questions in [`arhcitecture.md`](./arhcitecture.md).
Scope: hackathon proof of concept (Polish, targeting the **Lublin** city office). Status of each decision is marked **DECIDED** or **OPTIONAL**. Production roadmap is intentionally **out of scope** — this document records hackathon decisions only.

> **Leading theme (motyw przewodni).** Build a good interface for citizens to easily access services, **streamline the service process, and run multi-step processes across departments so both the citizen and the authority save time.**
>
> **Product framing (see D9).** This is **not** primarily a Q&A chatbot. The core is a **cross-department process orchestrator** with a visual citizen journey, served through **three role modes** — *young*, *senior (old people)*, and *office worker* (D11). The RAG assistant is a **copilot inside the process**, not the main surface. Decisions D1–D8 below stand, but several are repositioned by D9–D11 and the judging-criteria alignment table at the end.

---

## D1. Graph database for "general knowledge" — **DECIDED: No (not in hackathon scope)**

**Question.** Should we add a graph DB (Neo4j) for general knowledge, or does it not make sense in the current context?

**Decision.** Do **not** add a graph database for the hackathon. Use vector RAG + chunk metadata as the only retrieval path, plus a small structured-facts store (see D2) for deterministic data.

**Rationale.**
- A graph stores **structured relationships between city entities** (`Service REQUIRES Document`, `Department PROVIDES Service`). It does *not* store "general knowledge" — general knowledge is what the LLM already holds and what we deliberately suppress in favor of grounded answers. So "graph DB for general knowledge" is a category mismatch.
- The expensive part of a graph is **populating it**: an entity/relation extraction pipeline over the source docs. That is error-prone and adds a second surface for injected/garbage content.
- With 20–50 well-chunked documents, vector RAG + good metadata answers the large majority of citizen questions.
- It is another datastore to run live during the demo — more to fail on stage.
- The real differentiators are **grounding, citations, and guardrails**. Engineering effort belongs there.

**What we keep from the graph idea.** The one real win — deterministic structured facts (fees, phone numbers, opening hours, required-document lists) — is captured more cheaply by D2 without a graph.

**Note (post-theme).** The multi-step process *is* graph-shaped (a DAG of steps with cross-department dependencies — see D10). This does **not** revive a graph DB: the process graph is small and hand-authored, modeled fine in relational tables, and visualized in the frontend (D11).

---

## D2. Structured-facts store — **DECIDED: Yes (relational)**

**Decision.** Add a small relational structured-facts store alongside the vector DB. Use **SQLite** (real SQL, zero setup). Tables keyed by entity (department, service, office). Holds the facts most prone to hallucination — fees, deadlines, phone numbers, addresses, opening hours, required-document lists. Accessed through the capability registry (see D8).

**Rationale.** Directly serves the success criterion "do not invent fees, procedures, contacts, or deadlines." These facts are answered by lookup, not generation, removing the LLM from the loop for the riskiest data. Far cheaper than a graph and needs no extraction pipeline — the data is authored once during ingestion. Relational (vs JSON) so the D8 capability functions can query it with real SQL.

**Implementation note.** Retrieval can return both vector chunks (for prose) and matched structured facts (for hard data); the prompt presents structured facts as authoritative key/value context with their source (cite the record).

---

## D3. Retrieval approach — **DECIDED: Vector RAG + metadata filtering**

**Decision.** Single retrieval path: embed and chunk official docs, store in vector DB with metadata, retrieve top-K by similarity, filter/boost by metadata (department, language, validity dates).

**Stack.**
- Vector DB: **Qdrant** (preferred; Chroma acceptable for fastest local start).
- Embeddings: **multilingual-e5** — the corpus is **Polish** (Lublin office); e5 handles Polish well and keeps cross-lingual queries working. Documents are indexed in Polish; non-Polish output is produced by the translation model at answer time (see D6/D11), not by translating the corpus.
- Metadata schema: as in `arhcitecture.md` §7, with `validFrom`/`validTo` used to exclude expired content.

---

## D4. LLM runtime & models — **DECIDED: Ollama + Bielik (primary) + Qwen (translation)**

**Decision.** Run local models via **Ollama**. Two-model setup:
- **Primary answer model: Bielik** (SpeakLeash / ACK Cyfronet, Polish-native LLM). Chosen because the target user is the **Polish Lublin city office** — Polish-native instruction-following and civic terminology beat a generic multilingual model. Default to **Bielik-11B-v2.x**; fall back to **Bielik-4.5B** if the demo machine is GPU-constrained. Grounded strictly to retrieved context per the system prompt in `arhcitecture.md` §10.
- **Translation model: Qwen2.5** (multi-task) — translates Polish answers/UI strings into other languages on demand (see D11 multi-language). Bielik answers in Polish; Qwen handles outbound translation only. Keeps the grounding/answer path Polish-native while still serving non-Polish speakers.

**Note.** Both models run under one Ollama instance; load the translation model lazily so it doesn't compete for VRAM with Bielik during normal Polish-only use.

---

## D5. Guardrails — **DECIDED: In scope, prioritized**

**Decision.** Implement all four checks from `arhcitecture.md` §9, in priority order:
1. **Answer grounding + citation check** (highest value — core differentiator).
2. **Retrieved-content guard** (treat retrieved text as data, strip/ignore embedded instructions).
3. **Input guard** (basic prompt-injection / off-topic detection).
4. Safe fallback when context is insufficient.

**Rationale.** This is where engineering effort displaced from the graph DB goes. Grounding + citations are the demo's credibility.

---

## D6. Backend & frontend — **DECIDED: as proposed**

- Backend: **Node.js + Express**, endpoints per `arhcitecture.md` §5. Streaming response for chat UX.
- Frontend: **React + Vite + Tailwind**, chat UI with source citations and an "answer based on official sources" indicator.
- Orchestration: **LangChain.js** (or LlamaIndex.TS) — pick one and don't mix.
- Translation: answers are generated in Polish (Bielik, D4); when a non-Polish UI language is selected, the backend passes the Polish answer through the Qwen translation model before returning it.

---

## D7. Storage layout — **DECIDED**

**Decision.** Two stores, no separate JSON layer:
- **Document chunk metadata** lives in **Qdrant** alongside the vectors (D3).
- **Structured facts + process state** live in **SQLite** (D2, D10).

This keeps retrieval metadata next to the vectors and gives the capability registry real SQL over the structured/process data.

---

## D8. Capability registry — **DECIDED: registry yes, no MCP**

**Question.** Add an MCP interface so the LLM can get quick access to relational-DB data and so new capabilities can be pinned easily?

**Decision.** Build a **typed function registry** over the relational DB (D2/D10) — and **no MCP server**. The registry *is* the "pin a new capability" mechanism: adding a capability is adding one registry entry with a schema. MCP's value (multi-client reuse, decoupled capability boundary) doesn't pay for itself in a single-app hackathon, so it's dropped to cut a moving part.

**How it works:**
1. **Capability registry.** Typed functions (e.g. `getRequiredDocuments`, `getOpeningHours`, `findOffice`, `searchServices`, plus the process-advancing actions below) over SQLite. Single source of truth for structured access.
2. **Access pattern = router + hybrid retrieval.** A lightweight classify step routes a question to RAG (prose) / structured lookup / both; the backend calls registry functions **directly**. The model is not required to decide mid-generation to call a tool — this avoids the main failure mode of local-model agentic loops.

**Process actions.** The theme (D9) requires process-advancing **actions** (start application, submit step, hand off to next department), not only read-only lookups. For the hackathon these writes are **mocked/simulated** against SQLite (real state transitions, no external integrations).

**Rationale.** Registry access to the DB returns exact rows — no chunking or embedding drift for fees, hours, contacts. Outputs are from our own DB, so they are **authoritative**, strengthening grounding and citations (cite a record ID).

**Security (must-have).** Capability arguments are **untrusted input** (same trust level as user/retrieved content per §9): parameterized queries only, allowlisted operations, validated/typed arguments, read-only vs write separation. No string-built SQL.

---

## D9. Product framing & primary UX — **DECIDED: process orchestrator + AI copilot**

**Decision.** The product's center of gravity is a **cross-department process orchestrator**: a citizen is guided through a multi-step service process that spans several departments, via a visual journey. The RAG assistant (D3/D4) is a **copilot embedded in the process** (answers contextual questions, explains a step, pre-fills), **not** the primary surface. The "both sides save time" half of the theme is served by the **office-worker role mode** (D11) rather than a separate dual-view screen.

**Rationale.** Directly serves the leading theme ("streamline the process, multi-step across departments, both sides save time"). It also resolves the judging-rubric gap: a generic Q&A chatbot scores weakly on originality/visual/interactivity; a process orchestrator delivers those by construction (see alignment table).

**Demo scope (guardrail).**
- **One hero process modeled end-to-end**, visibly touching **≥3 departments** — e.g. *open a food business* (registry → tax → sanitary → zoning) or *organize a public event* (roads → safety → sanitation).
- 1–2 additional processes stubbed for breadth.
- **No separate dual view.** Authority-side time saving is shown through the **office-worker mode** (D11), where a clerk sees the same process arriving with pre-validated, structured data.

> **Note — hero process: OPEN, gated on data discovery.** The hero process will be chosen and built **once we know what real source data is available** for the DB — the available Lublin city-office content (departments, services, required documents, procedures) decides which process can be modeled end-to-end with authentic data. Do **not** pick a process before data discovery; pick the one best supported by the data we actually have. Candidates to validate against the data: *open a food business* and *organize a public event* (both touch ≥3 departments). The chosen process then drives the D10 step DAG and the demo script.

---

## D10. Process / workflow model — **DECIDED: relational DAG, no Neo4j, optional state machine**

**Decision.** Model a process as a **DAG of steps with cross-department dependencies**, stored relationally:
- `process` (id, name, description)
- `step` (id, process_id, name, owning_department, required_documents, inputs/outputs)
- `step_dependency` (step_id, depends_on_step_id)
- `process_instance` (id, process_id, citizen_ref, status)
- `instance_step_status` (instance_id, step_id, status, data, completed_at)

Transition logic optionally expressed with a state-machine library (**XState**) on the backend. **No Neo4j** — small hand-authored graphs; relational + state machine is sufficient (see D1 note).

**Rationale.** Makes "what's done / what's next / which department / what's blocking" a deterministic query, not an LLM guess. Feeds the citizen stepper and the office-worker mode, and powers the D11 graph visualization from a single source of truth.

---

## D11. Presentation & interactive layer — **DECIDED**

**Decision.** Frontend (React + Vite + Tailwind, D6) delivers:
1. **Three role modes** — the audience-fit mechanism (criterion 5):
   - **Young mode** — fast, dense, mobile-first; minimal hand-holding, keyboard/quick actions.
   - **Senior (old people) mode** — large type, high contrast, fewer elements per screen, step-by-step guidance, plain language.
   - **Office-worker mode** — the authority side: sees incoming processes with pre-validated, structured data; advances/hands off steps. This is how "both sides save time" is demonstrated (replaces the dropped dual view, see D9).
2. **Visual journey stepper** — the hero process as an interactive progress flow (done / current / blocked / upcoming, with owning department per step).
3. **Interactive process graph** — the D10 DAG rendered as an explorable graph of steps ↔ departments ↔ required documents. This is the visual/interactive/originality centerpiece (the "graph visualization" without a graph DB).
4. **Structured answer cards** — services/steps rendered as cards (fee badge, office mini-map, hours, **checkable required-documents list**) from the relational data (D2), not prose blobs.
5. **Transparency UI** — inline citation highlighting + "grounded in official sources" indicator for any copilot answer.
6. **Multi-language** — default Polish (Bielik, D4). A language toggle requests on-demand translation of answers/UI strings via the Qwen translation model (D4/D6). The corpus and grounding stay Polish; only the output is translated.

**Rationale.** Each item maps to a specific weak judging criterion (4, 5, 6, 7, 8, 9) while reinforcing the theme. The innovation hook is **a transparent, explorable, cross-department process copilot, adapted per audience** — differentiated from existing static portals and single-form e-gov tools.

---

## D12. User feedback & product-improvement metrics — **DECIDED: lightweight in-app feedback + event metrics**

**Question.** How do we know whether answers and processes actually help citizens, and what should we improve next?

**Decision.** Add a **lightweight feedback + metrics mechanism** so the product can be measured and improved, not just demoed.

1. **Per-answer feedback (copilot).** Each copilot answer carries a thumbs-up/down control and an optional one-line comment. A down-vote optionally asks a reason (wrong / not grounded / incomplete / off-topic). Stored with the answer's question, retrieved source IDs/citations, role mode, and language so a bad answer is traceable to its retrieval.
2. **Per-step feedback (process).** Each step in the journey stepper exposes a quick "was this step clear?" signal, capturing where citizens get stuck in a cross-department process.
3. **Implicit event metrics.** Log anonymous interaction events — question asked, route taken (RAG / structured / both), fallback shown ("not enough information"), citation present/absent, process started / step completed / step abandoned, language and role mode, latency. These are the **product-improvement signals**, distinct from explicit thumbs.
4. **Storage.** A `feedback` table and an `event` table in **SQLite** (D7) — same store, no new infrastructure. Keyed to answer/process-instance/step where applicable.
5. **Metrics surface.** A simple read-only metrics view (counts + rates) computed by SQL over the two tables: answer satisfaction rate, fallback rate, citation-coverage rate, top down-voted questions, step abandonment by step/department, language/role-mode breakdown. Office-worker mode (D11) is the natural home for this dashboard.

**Key metrics (the improvement loop).**
- **Answer satisfaction** = up-votes / rated answers.
- **Grounding/citation coverage** = answers with citations / factual answers.
- **Fallback rate** = "not enough information" responses / total (gap = missing knowledge to ingest, ties back to D2/D3).
- **Process completion / abandonment** per step and department (where to streamline, ties back to D9/D10).
- **Down-voted question clusters** → the prioritized backlog for new documents and capabilities.

**Rationale.** Closes the loop on the leading theme ("save time for both sides"): metrics show *where* time is lost and which answers fail. The fallback rate and down-voted clusters directly drive what to ingest next (D2/D3); step abandonment drives which process to streamline (D9/D10). It is cheap — two SQLite tables and SQL aggregates, no analytics service — and aligns with the production roadmap item "Feedback collection / Analytics dashboard" (`arhcitecture.md` §16), pulled forward in minimal form.

**Scope guardrail (hackathon).** Feedback capture (1–3) is **in scope** and easy to demo. The metrics dashboard (5) is **OPTIONAL** — if time is short, ship capture + a couple of headline numbers rather than a full dashboard.

**Privacy.** Events are **anonymous** — no PII, no citizen identity beyond an opaque session/instance reference. Free-text comments are treated as untrusted input (same trust level as user content per §9).

---

## D13. Accessibility standard — **DECIDED: WCAG 2.1 Level AA**

**Question.** What accessibility bar do we hold the frontend to?

**Decision.** Target **WCAG 2.1 Level AA** across the React frontend (D6/D11). This is not optional polish — it is mandated by the audience: a **Polish city-office** product is a public-sector service, and the **senior role mode** (D11) exists precisely to serve users with low vision, low digital literacy, or motor difficulty. WCAG 2.1 AA is also the legal baseline for EU/Polish public-sector sites (EU Directive 2016/2102, transposed into Polish law).

**What this means concretely (hackathon-demoable subset):**
- **Perceivable** — text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components); never color alone to convey state in the journey stepper (done/current/blocked also use icon + label); all meaningful images/icons have text alternatives.
- **Operable** — full keyboard navigation (stepper, cards, language/role toggles, chat input); visible focus indicators; target sizes comfortable in senior mode; no keyboard traps.
- **Understandable** — plain language (already a senior-mode goal); `lang` attribute set and updated by the multi-language toggle (D11/D6); consistent navigation; clear, programmatically associated error/validation messages on forms and the document checklist.
- **Robust** — semantic HTML + ARIA where needed; the interactive process graph (D11) exposes an accessible text/list fallback so it isn't a visual-only feature; live regions announce streamed answers and step transitions.

**Cross-references.** Reinforces **D11** (senior mode is the accessibility-first surface; the three role modes are the audience-fit mechanism) and constrains **D6/D11** UI work. Feedback controls from **D12** must themselves meet AA (labeled, keyboard-reachable).

**Scope guardrail (hackathon).** Hold the **hero process + copilot flow** (the demo path) to AA and verify it (keyboard pass + contrast check + a screen-reader smoke test). Full-app conformance audit and a formal accessibility statement are **production roadmap**, not hackathon scope.

---

## Judging-criteria alignment (motyw przewodni)

| # | Criterion | How the stack addresses it | Primary decision |
|---|---|---|---|
| 1 | Add new data | Ingestion script + admin upload + relational authoring | D2, D6, D7 |
| 2 | Extend the interface | Capability registry "pin a capability"; component-based UI | D8, D11 |
| 3 | Theme narrative | Cross-department process; **office-worker mode proves both sides save time** | D9, D11 |
| 4 | Data application & presentation | Structured cards, journey stepper, process state | D10, D11 |
| 5 | Target-audience fit | **Three role modes** (young / senior / office worker) + Polish-first multi-language | D11 |
| 6 | Visual layer | Journey stepper + interactive process graph | D11 |
| 7 | Innovation | Process copilot with grounded, transparent answers; Bielik Polish-native | D4, D9, D11 |
| 8 | Originality vs existing | Cross-department orchestration + explorable graph (not another Q&A bot) | D9, D10, D11 |
| 9 | Interactive elements | Stepper, explorable graph, checkable doc lists, role modes | D11 |

---

## Summary table

| Area | Decision | Status |
|---|---|---|
| **Product framing** | Cross-department process orchestrator + AI copilot | **DECIDED** |
| **Process / workflow model** | Relational DAG (+ optional XState); no graph DB | **DECIDED** |
| **Presentation layer** | Journey stepper, interactive process graph, **3 role modes** | **DECIDED** |
| **Role modes** | Young / senior / office-worker | **DECIDED** |
| Graph DB | Not used (category mismatch; process modeled relationally) | **DECIDED — No** |
| Structured-facts / process store | SQLite | **DECIDED — Yes** |
| Capability layer | Typed registry over DB; +mocked process actions | **DECIDED — Yes** |
| MCP interface | Not used | **DECIDED — No** |
| Tool-calling pattern | Router + hybrid retrieval (no open agent loop) | **DECIDED** |
| Retrieval | Vector RAG (Qdrant) + multilingual-e5, Polish corpus | **DECIDED** |
| Answer LLM | Ollama + **Bielik** (11B, 4.5B fallback) | **DECIDED** |
| Translation model | Ollama + **Qwen2.5** (Polish → other langs) | **DECIDED** |
| Guardrails | All four, grounding-first | **DECIDED** |
| Feedback & metrics | In-app feedback + event metrics in SQLite; dashboard optional | **DECIDED** |
| Accessibility | WCAG 2.1 Level AA (demo path verified; full audit = production) | **DECIDED** |
| Backend/Frontend | **Express** + React/Vite/Tailwind | **DECIDED** |
