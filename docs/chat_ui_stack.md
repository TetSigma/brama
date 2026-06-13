# Chat UI/UX — Library Stack Plan (`brama-web`)

> Library selection for building the chat copilot UI. Derived from `AGENTS.md` (architecture rules),
> `DECISIONS.md` (product decisions D1–D14), `arhcitecture.md`, and `docs/content_blocks.md`.
> Product framing (D9): a cross-department **process orchestrator** with a **chat copilot** embedded,
> served through **3 role modes** (young / senior / office-worker), WCAG 2.1 AA (D13).

## Confirmed decisions

- **Styling: Tailwind CSS** — per docs (D6/D11, §14). Integrate with the existing design-token system
  (`src/styles/theme.css`) by mapping CSS variables into the Tailwind theme, so the Lublin palette and
  spacing/radii tokens stay the single source of truth. Keep existing `ui/` primitives; restyle with Tailwind incrementally.
- **Accessible primitives: Radix UI (headless)** — for collapsible legal/RODO blocks, dialogs, tooltips.
  Unstyled, so it composes with Tailwind; gives WCAG 2.1 AA keyboard/focus/ARIA for free (D13).

---

## Current stack (installed today)

| Lib | Version | Purpose |
|---|---|---|
| `react` / `react-dom` | 19.2 | UI runtime |
| `vite` | 8 | Dev server + bundler |
| `typescript` | 6 | Types (strict) |
| `i18next` + `react-i18next` | 26 / 17 | Multi-language (PL default, + others) — already wired (D11.6) |
| `@fontsource/noto-sans` | 5 | Self-hosted font |
| `eslint` + `typescript-eslint` | 10 / 8 | Lint |

> Current app is a **landing page**, not yet a chat app. No routing, data layer, or state store yet.

---

## Planned libraries

Layers follow `AGENTS.md`. Status: ✅ installed · 📋 mandated by AGENTS.md · ➕ proposed for chat.

### Data layer
| Lib | Status | Purpose |
|---|---|---|
| `@tanstack/react-query` | 📋 | All remote fetch/cache/mutations via domain hooks. Chat send, history load, feedback POST. |
| `zod` | 📋 | Validate API responses + the answer-block schema at the trust boundary (D5 guardrails). |
| native `fetch` + ReadableStream *(fallback: `@microsoft/fetch-event-source`)* | ➕ | Stream chat tokens (D6 streaming UX). Try native streaming first; add the dep only if SSE ergonomics require it. |

### State layer
| Lib | Status | Purpose |
|---|---|---|
| `zustand` | 📋 | Shared client state: active chat session, **role mode** (young/senior/worker), process-instance state. No Redux/Jotai/etc (forbidden without approval). Server data stays in React Query, not here. |

### UI layer
| Lib | Status | Purpose |
|---|---|---|
| `tailwindcss` + `@tailwindcss/vite` | ➕ | Styling system (confirmed). Theme mapped to existing `theme.css` CSS variables. |
| existing `ui/` primitives | ✅ | `UIButton/UICard/UIBadge/UIText/UIField` — reused as the base for answer blocks. |
| `@radix-ui/react-{accordion,collapsible,dialog,tooltip,tabs}` | ➕ | Accessible collapsible blocks (legal/RODO), modals, role-mode tabs. WCAG 2.1 AA (D13). |
| `react-markdown` + `remark-gfm` | ➕ | Render LLM markdown answers (lists, tables, links). |
| `rehype-sanitize` | ➕ | Sanitize model/retrieved markup — untrusted output (D5 retrieved-content guard). |
| `@xyflow/react` (React Flow) | ➕ | **Interactive process graph** (D11.3 centerpiece): steps ↔ departments ↔ documents DAG. |
| `lucide-react` | ➕ | Icons for answer blocks (form / fee / map / call / deadline). Tree-shakeable. |

### Business / page layer
| Lib | Status | Purpose |
|---|---|---|
| `react-router` (v7) | ➕ | Routes: chat · journey stepper · office-worker mode · metrics. |
| `react-hook-form` | 📋 | Document checklist, wniosek pre-fill (D14), feedback form. |
| `@tanstack/react-virtual` | ➕ (defer) | Virtualize long chat history. Add only when message lists grow. |

### Already covered — no new dependency
| Need | Use |
|---|---|
| Multi-language (D11.6) | `i18next` (wired) |
| Animation / motion (AGENTS.md) | CSS transitions + `prefers-reduced-motion` (already in `App.tsx`). No Framer Motion unless interaction complexity justifies it. |
| Process state machine (D10) | Backend concern (optional XState on BE), not a web dep. |

---

## Maps to content blocks

The chat answer renders the blocks in `docs/content_blocks.md`. Library responsibilities:

- **Text/markdown answer** → `react-markdown` + `rehype-sanitize`
- **Structured answer cards** (fee, deadline, dept, docs checklist) → `ui/` primitives + Tailwind + `lucide-react`
- **Download / map / call buttons** → `UIButton`
- **Collapsible legal / RODO / appeal** → Radix `Collapsible`/`Accordion`
- **Related-services chips** → `UIButton` (re-query)
- **Citations / "grounded in official sources"** → custom component, data validated by `zod`
- **Feedback (D12)** → `react-hook-form` + React Query mutation
- **Process graph** → `@xyflow/react`

---

## Install groups (when build starts)

```sh
# Data + state + forms (AGENTS.md mandated)
npm i -w brama-web @tanstack/react-query zod zustand react-hook-form
# Styling
npm i -w brama-web tailwindcss @tailwindcss/vite
# Chat rendering + a11y primitives + icons
npm i -w brama-web react-markdown remark-gfm rehype-sanitize lucide-react \
  @radix-ui/react-accordion @radix-ui/react-collapsible @radix-ui/react-dialog \
  @radix-ui/react-tooltip @radix-ui/react-tabs
# Routing + process graph
npm i -w brama-web react-router @xyflow/react
# Defer until needed
# npm i -w brama-web @tanstack/react-virtual
```

## Open follow-ups

1. Tailwind ↔ `theme.css` token bridge: define the mapping (colors/spacing/radii → Tailwind `@theme`) so there's one token source.
2. Confirm BE streaming contract (SSE vs WebSocket) before finalizing the streaming dep.
3. Next deliverable: implementation plan for the chat screen (component tree, answer-block renderer, file layout).
