# Tag system & content-block protocol

How the chatbot returns rich UI blocks alongside its prose. Implements
[content_blocks.md](./content_blocks.md). Backend is done; this is the contract
the React client parses.

## Wire format — `POST /api/chat`

`Content-Type: text/plain` stream. The first line is a JSON **bundle**, followed
by the delimiter `\n--BRAMA--\n`, followed by the streamed prose:

```
{"blocks":{ "service":{...}, "map":{...}, "fee":{...} }}
--BRAMA--
Aby zarejestrować pojazd musisz złożyć [[docs]]. Opłata wynosi [[fee]],
a urząd znajdziesz tutaj [[map]].
```

Client algorithm:
1. Read until the first `\n--BRAMA--\n`; `JSON.parse` the part before it → `blocks`.
2. Stream the rest as the message text. Tokens arrive incrementally; buffer so a
   `[[tag]]` split across chunks isn't missed.
3. Replace each `[[tag]]` with the component fed by `blocks[tag]`. Unknown tags
   or tags with no matching bundle key → render the literal text (or drop it).
4. Render the **non-tagged** blocks (header, contact, related, legal, rating)
   automatically from `blocks` — they have no inline tag.

The bundle line is **always** emitted (even `{"blocks":{}}` on a refusal /
off-topic turn) so step 1 is uniform.

## Inline tags (placed by the model)

Only these five appear in prose, and only when their data exists this turn:

| Tag | Bundle key | Component |
|---|---|---|
| `[[map]]` | `map` | Google Maps card (marker + route) |
| `[[fee]]` | `fee` | Fee badge |
| `[[deadline]]` | `deadline` | Deadline badge |
| `[[docs]]` | `docs` | Required-documents list |
| `[[form]]` | `form` | Downloadable-form button(s) |

The model is told per-turn which of these are available, so it won't emit a tag
that resolves to nothing. It never writes the value into the tag — the value
comes from the bundle (no hallucinated fees/addresses).

## Auto-rendered blocks (no tag — render from bundle)

`service` (card no., dept, BIP link, status, updated), `contact` (phone, email,
hours), `pickup`, `related` (prerequisite services), `legal` (appeal / legal
basis / GDPR / extra info — collapsible). Rating (#20) is a client-only block.

## Bundle schema

```ts
type Bundle = {
  service?: { cardId; nazwa; komorka; url; status?; aktualizacja? }
  map?:      { symbol; nazwa; adres; lat; lng }          // only if geocoded
  fee?:      { text }
  deadline?: { text?; submission? }
  docs?:     { required?; attachments?; toView? }        // Polish prose per part
  form?:     { nazwa; url }[]
  contact?:  { telefon?; email?; godziny? }
  pickup?:   { text }
  related?:  { cardId; nazwa }[]
  legal?:    { appeal?; basis?; gdpr?; additional? }
}
```
Keys are present only when data exists — test by presence.

## Map block → route — `POST /api/maps/route`

The `map` block carries `symbol` + coords. To draw the route, send the resolved
office (no re-retrieval, no drift):

```jsonc
{ "symbol": "KM", "origin": { "lat": 51.246, "lng": 22.568 } }
// or { "dest": { "lat": 51.25, "lng": 22.55 }, "origin": {...} }
// fallback: { "query": "gdzie zarejestrowac auto", "origin": {...} }
```
→ `{ dest:{symbol,nazwa,adres,lat,lng}, polyline, distanceMeters, duration, viewport }`
(`polyline`/metrics null when `origin` omitted → marker-only). `travelMode` opt:
`DRIVE` (default) / `WALK` / `BICYCLE`.

## Notes / limits

- Translation (non-pl): the translator is told to keep `[[...]]` verbatim, but a
  small model may occasionally drop one — client must tolerate missing tags.
- `GET /api/history/:id` returns stored prose **with** `[[tags]]` but **no**
  bundle — replayed history can't resolve blocks yet (acceptable for now).
- Bundle is built from the **top** retrieval hit only (the primary service).
