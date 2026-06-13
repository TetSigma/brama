# Chat Screen — Implementation Plan (`brama-web`)

> Frontend build plan for the chat copilot. Grounded in `AGENTS.md` (4-layer architecture),
> `DECISIONS.md` (D9 process copilot, D11 role modes, D12 feedback, D13 WCAG AA),
> `docs/content_blocks.md` (answer blocks), and `docs/chat_ui_stack.md` (libraries).
> Build the FE against a **mock adapter** first so it ships independently of BE/LLM.

---

## 1. Scope of this plan

- A working **chat screen**: input → streamed answer → structured answer blocks → citations → feedback.
- **3 role modes** (young / senior / office-worker) switching layout density + language level (D11).
- **Block renderer** that turns a typed answer payload into the cards in `content_blocks.md`.
- Mock data adapter now; swap to real `/api/chat` later (BE only has `/health` today).

Out of scope here: journey stepper, interactive process graph, metrics dashboard (later plans).

---

## 2. Backend contract (FE builds against this)

BE has no chat route yet. FE codes to this contract; BE implements it after.

```
POST /api/chat            // body: { sessionId, message, role, lang }
                          // returns: text/event-stream (SSE)
POST /api/feedback        // body: { answerId, vote, reason?, comment? }  (D12)
GET  /api/chat/:sessionId // load history (React Query)
```

SSE event sequence per answer:
```
event: token   data: {"delta":"..."}          // streamed prose (repeats)
event: blocks  data: {"blocks":[ ... ]}        // structured answer blocks (once, validated by zod)
event: meta    data: {"answerId","citations":[...],"grounded":bool}
event: done    data: {}
```

Block payload = discriminated union, one variant per `content_blocks.md` row:
`serviceHeader | department | documents | downloadForm | fee | deadline | submitPlace |
collectPlace | appeal | legalBasis | gdpr | additionalInfo | relatedServices | sourceLink |
status | feedbackPrompt`. Validated with **zod** at the boundary; unknown variants render a safe fallback.

---

## 3. File structure (new)

Follows AGENTS.md feature map. Tailwind added (bridged to `theme.css` tokens).

```
brama-web/
  src/
    main.tsx                      # + QueryClientProvider, RouterProvider
    router.tsx                    # react-router routes
    pages/
      ChatPage.tsx                # business layer: orchestrates hooks → UI
    features/chat/
      components/
        ChatThread.tsx            # message list (virtualize later)
        ChatMessage.tsx           # one bubble (user | assistant)
        ChatComposer.tsx          # input + send (react-hook-form)
        AnswerBlocks.tsx          # maps blocks[] → block components
        blocks/                   # one file per block variant
          ServiceHeaderBlock.tsx
          DocumentsBlock.tsx
          DownloadFormBlock.tsx
          FeeBlock.tsx
          DeadlineBlock.tsx
          PlaceBlock.tsx          # submit + collect (map/call buttons)
          CollapsibleBlock.tsx    # appeal / legalBasis / gdpr (Radix Collapsible)
          RelatedServicesBlock.tsx
          CitationsBlock.tsx
          FeedbackBlock.tsx       # D12 thumbs + reason
        RoleModeSwitch.tsx        # young | senior | worker (Radix Tabs)
        Markdown.tsx              # react-markdown + remark-gfm + rehype-sanitize
      hooks/
        useChat.ts                # domain hook: send + stream (React Query mutation)
        useChatHistory.ts         # React Query query
        useFeedback.ts            # React Query mutation
      api/
        chatClient.ts             # SSE fetch wrapper
        chatMock.ts               # MOCK adapter (used until BE ready)
      schema/
        blocks.ts                 # zod schemas + inferred types for block union
    stores/
      uiStore.ts                  # zustand: role mode (lang already in i18n)
      chatSessionStore.ts         # zustand: sessionId, draft, streaming flag
    lib/
      queryClient.ts
  ui/                             # existing primitives — reused
  tailwind bridge in src/index.css (@theme mapped to theme.css vars)
```

---

## 4. Data flow (one turn)

```
ChatComposer (RHF) --submit--> useChat.send()
  -> chatClient.stream() [or chatMock] opens SSE
  -> token events  -> append to streaming message (zustand)
  -> blocks event  -> zod.parse -> store typed blocks on message
  -> meta event    -> citations + grounded flag
  -> done          -> mark complete; React Query cache updated
ChatThread re-renders -> ChatMessage -> Markdown + AnswerBlocks
AnswerBlocks -> switch(block.type) -> block component (from ui/ primitives)
FeedbackBlock -> useFeedback.mutate() -> POST /api/feedback
```

Rule (AGENTS.md): no fetch inside components. All network in `features/chat/api` + domain hooks.
Server state in React Query; only role mode + session draft in Zustand.

---

## 5. Block → component → primitive mapping

| Block (content_blocks.md) | Component | Built from |
|---|---|---|
| Service header (#1, #18) | `ServiceHeaderBlock` | `UIHeading` + `UIBadge` (card number, status) |
| Department (#2) | inline in header | `UIBadge` |
| Documents checklist (#3) | `DocumentsBlock` | `UIField` checkboxes (RHF) |
| Download form (#4) | `DownloadFormBlock` | `UIButton` + `lucide` file icon |
| Fee (#5) | `FeeBlock` | `UIBadge tone="info"` |
| Deadline (#6, #7) | `DeadlineBlock` | `UIBadge` + clock icon |
| Submit / collect place (#8–#11) | `PlaceBlock` | `UICard` + map/call `UIButton`s |
| Appeal / legal / GDPR (#12–#14) | `CollapsibleBlock` | **Radix Collapsible** (collapsed default) |
| Additional info (#15) | inline `Markdown` | — |
| Related services (#16) | `RelatedServicesBlock` | `UIButton variant="quiet"` chips → re-query |
| Source link (#17, #19) | `CitationsBlock` | `UIText` + link + update date |
| Feedback (#20) | `FeedbackBlock` | `UIButton` + RHF (vote/reason/comment) |

---

## 6. Role modes (D11) — one data set, different presentation

Stored in `uiStore` (zustand). Drives a `data-role` attribute on the chat shell; Tailwind/CSS keys off it.

| Mode | Layout | Behavior |
|---|---|---|
| Young | dense, mobile-first | all blocks, quick-action chips |
| Senior | large type, high contrast, one thing at a time | formalities collapsed, big buttons, prominent "Call", voice optional later |
| Office-worker | all sections expanded, card number prominent | search by card/dept, report-error affordance |

Language level (plain vs full) handled by sending `role` to BE; FE just renders.

---

## 7. Accessibility (D13, WCAG 2.1 AA)

- Semantic: `<form>` composer, `<button>` actions, `<a>` links, headings in order.
- Radix primitives give keyboard + focus + ARIA for collapsibles/dialogs/tabs.
- `aria-live="polite"` region announces streamed answer + completion.
- Status never color-only — icon + label on status/deadline badges.
- Visible focus rings (already `--color-focus` token); contrast ≥ 4.5:1 from token palette.
- `lang` attribute already managed by i18n on language change.

---

## 8. Build order (phases)

1. **Setup** — add libs (chat_ui_stack.md groups); Tailwind + `@theme` token bridge; QueryClient + router providers; `/chat` route.
2. **Mock chat loop** — `chatMock.ts` streams canned tokens + blocks; `useChat`; `ChatThread`/`ChatMessage`/`ChatComposer`; Markdown render. Visible end-to-end with fake data.
3. **Block renderer** — `blocks.ts` zod union; `AnswerBlocks` + all block components on `ui/` primitives.
4. **Role modes** — `uiStore` + `RoleModeSwitch` + per-role CSS.
5. **Feedback** — `FeedbackBlock` + `useFeedback` (mock POST).
6. **A11y pass** — keyboard, live region, contrast, screen-reader smoke test on the chat path.
7. **Wire real BE** — swap `chatMock` → `chatClient` once `/api/chat` SSE exists. No component changes.

Each phase ends green: `npm run lint && npm run typecheck && npm run build`, plus browser QA at desktop + mobile widths (AGENTS.md).

---

## 9. Risks / open items

- **Tailwind ↔ theme.css bridge** must be defined once (colors/spacing/radii → `@theme`) to avoid a second token source.
- **SSE vs WebSocket** — plan assumes SSE; confirm with BE before phase 7.
- **Block schema is the contract** between FE and BE — author `blocks.ts` zod schemas first; BE mirrors them.
- Virtualization (`@tanstack/react-virtual`) deferred until threads are long enough to need it.
