# Qmatic Web Booking Integration (Lublin)

Integration notes for the Lublin city appointment-reservation system at
<https://rezerwacja.lublin.eu/qmaticwebbooking/#/>.

The site is a **Qmatic Web Booking** single-page app (Vue 2). The SPA is backed
by a public, unauthenticated REST API ("Qmatic Calendar / Web Booking" REST
namespace). All the data the UI shows — offices, services, available dates and
free time slots — is served by `GET` endpoints that require **no API key, no
login, and no cookie**. This document describes how to consume those endpoints
to (a) list the services the city offers and (b) read free appointment slots.

> Scope: this covers the **read** path (services + free slots), which is fully
> public. The **write** path (reserve → confirm a real appointment) is
> documented for completeness but is intentionally out of scope for us — see
> [Booking (write) flow](#5-booking-write-flow--out-of-scope) and
> [Operational & ethical constraints](#7-operational--ethical-constraints).

---

## 1. Base URL and conventions

| | |
|---|---|
| **API base** | `https://rezerwacja.lublin.eu/qmaticwebbooking/rest/schedule` |
| **Auth (reads)** | none |
| **Content type** | `application/json` |
| **Stack** | Java backend (JAX-RS), Vue 2 SPA |

### Matrix parameters (important)

Qmatic does **not** use normal `?key=value` query strings for most parameters.
It uses **JAX-RS matrix parameters**: `;key=value` segments appended to a path
segment, e.g.

```
/branches/{branchId}/dates;servicePublicId=<id>;customSlotLength=5
```

A parameter that is a list (e.g. multiple services) is repeated:
`;servicePublicId=A;servicePublicId=B`.

⚠️ Do **not** URL-encode the leading `;` separators — they are part of the path,
not a query string. Encode the *values* if needed.

### Identifier types

Each entity exposes several IDs. **Always use the `publicId` (services) / `id`
(branches)** — the long hex hashes — in API calls. The numeric `internalId` and
`qpId` are internal Qmatic identifiers and are not the routing keys.

| Entity | Routing key | Other fields |
|---|---|---|
| Branch | `id` (hex hash) | `internalId`, `qpId`, `name`, `custom` (JSON), `timeZone` |
| Service | `publicId` (hex hash) | `internalId`, `qpId`, `name`, `duration`, `additionalDuration` |

---

## 2. Read endpoints (public)

All verified live against the Lublin instance.

### 2.1 List all branches (offices)

```
GET /branches
```

Response (truncated):

```json
[
  {
    "id": "802879a2ea9863f4772a597c3cdc01a7248a0e483ce638c6bae425ecc24bf0bc",
    "name": "BOM Filaretów",
    "internalId": 3,
    "qpId": "16",
    "addressLine1": "ul. Filaretów 44",
    "addressZip": "20-609",
    "addressCity": "Lublin",
    "addressCountry": "Polska",
    "timeZone": "Europe/Warsaw",
    "custom": "{\"names\":{\"pl\":\"BOM Filaretów\"}, ...}"
  }
]
```

Notes:
- `custom` is a **stringified JSON** blob — parse it again to get localized
  `names`, address overrides, confirmation messages, and active flags.
- Branch names map to Lublin's "Biuro Obsługi Mieszkańców" (BOM) offices:
  Filaretów, Kleeberga, Nowy Świat, Szaserów, …

### 2.2 List all services (city offerings)

```
GET /services;validate=true
```

Optionally preselect services to validate combinations:

```
GET /services;preselectedServices=<id1>,<id2>;validate=true
```

Response (truncated):

```json
[
  {
    "publicId": "d17e3064681492fbc7ea0a4aa2013ea5ed57d1136f3cdab44b6d1e0fda75ebfb",
    "name": "Architektura",
    "internalId": 10,
    "qpId": "9",
    "duration": 5,
    "additionalDuration": 0,
    "custom": "{\"names\":{\"pl\":\"Architektura\"}}"
  }
]
```

`duration` is the slot length in **minutes**. Example services seen on the live
instance: *Architektura*, *Dodatki mieszkaniowe*, *Dowody osobiste*,
*Dodatki mieszkaniowe, prawo jazdy, podatki*, …

### 2.3 Services available at a specific branch

```
GET /branches/{branchId}/services
GET /branches/{branchId}/services;preselectedServices=<id1>,<id2>
```

Returns the subset of services bookable at that office. Use this to drive a
"pick office → pick service" UI.

### 2.4 Branches that offer a given service

```
GET /services/{servicePublicId}/branches          # single service
GET /branches/available;servicePublicId=<id1>;servicePublicId=<id2>   # multi
```

Useful for a "pick service → pick office" UI.

### 2.5 Service groups (optional categorization)

```
GET /serviceGroups
GET /serviceGroups;preselectedServices=<id1>,<id2>
GET /branches/{branchId}/serviceGroups
```

### 2.6 Available dates — **free days for a service** ⭐

```
GET /branches/{branchId}/dates;servicePublicId=<id>;customSlotLength=<minutes>
```

- `customSlotLength` = the service `duration` (minutes). Required.
- For multiple services, repeat `;servicePublicId=`.

Response — an array of bookable dates:

```json
[
  { "date": "2026-06-15" },
  { "date": "2026-06-16" },
  { "date": "2026-06-17" }
]
```

### 2.7 Available times — **free slots on a day** ⭐

```
GET /branches/{branchId}/dates/{YYYY-MM-DD}/times;servicePublicId=<id>;customSlotLength=<minutes>
```

Response — the free slots:

```json
[
  { "date": "2026-06-15", "time": "08:00" },
  { "date": "2026-06-15", "time": "08:30" },
  { "date": "2026-06-15", "time": "09:00" }
]
```

This is the core of "get free slots": **branches → branch services → dates →
times**.

### 2.8 Supporting endpoints

```
GET /configuration                 # global config (sets JSESSIONID cookie)
GET /uiMessages?lang=pl            # localized UI strings
```

---

## 3. End-to-end read flow

```
1. GET /branches                                   → choose an office (branch.id)
2. GET /branches/{id}/services                     → choose a service (publicId, duration)
3. GET /branches/{id}/dates;servicePublicId=…;customSlotLength=…   → free days
4. GET /branches/{id}/dates/{date}/times;servicePublicId=…;customSlotLength=…  → free slots
```

### Verified `curl` walkthrough

```bash
BASE="https://rezerwacja.lublin.eu/qmaticwebbooking/rest/schedule"
BR="802879a2ea9863f4772a597c3cdc01a7248a0e483ce638c6bae425ecc24bf0bc"   # BOM Filaretów
SVC="e10037c652d3d06cb16a9bf3f4faf0fd6a67828454e58abeb68f6a4929d74ce7"  # duration 10

# free days
curl -s "$BASE/branches/$BR/dates;servicePublicId=$SVC;customSlotLength=10"
# → [{"date":"2026-06-15"}, …]

# free slots for a day
curl -s "$BASE/branches/$BR/dates/2026-06-15/times;servicePublicId=$SVC;customSlotLength=10"
# → [{"date":"2026-06-15","time":"08:00"}, …]
```

---

## 4. Suggested client integration (this project)

Per `AGENTS.md`, network access lives in the **Data layer** behind domain hooks,
uses **TanStack Query**, and validates external data with **Zod**. Treat the
Qmatic responses as an untrusted boundary (stringified `custom` JSON, fields
that may appear/disappear).

### 4.1 Infrastructure helper — `src/lib/qmatic.ts`

```ts
const QMATIC_BASE =
  import.meta.env.VITE_QMATIC_BASE ??
  "https://rezerwacja.lublin.eu/qmaticwebbooking/rest/schedule";

/** Build a JAX-RS matrix-parameter path. Values are encoded; ';' kept literal. */
export function matrix(
  base: string,
  params: Array<[string, string | number]>,
): string {
  return params.reduce(
    (acc, [k, v]) => `${acc};${k}=${encodeURIComponent(String(v))}`,
    base,
  );
}

export async function qmaticGet<T>(path: string): Promise<T> {
  const res = await fetch(`${QMATIC_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Qmatic ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}
```

### 4.2 Schemas — `src/lib/qmatic.schemas.ts`

```ts
import { z } from "zod";

export const branchSchema = z.object({
  id: z.string(),
  name: z.string(),
  internalId: z.number(),
  qpId: z.string(),
  addressLine1: z.string().optional(),
  addressCity: z.string().optional(),
  timeZone: z.string().optional(),
  custom: z.string().optional(), // stringified JSON — parse downstream
});

export const serviceSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  duration: z.number(),         // minutes — use as customSlotLength
  additionalDuration: z.number().default(0),
  internalId: z.number(),
  qpId: z.string(),
});

export const dateSchema = z.object({ date: z.string() });           // YYYY-MM-DD
export const slotSchema = z.object({ date: z.string(), time: z.string() }); // HH:mm

export const branchesSchema = z.array(branchSchema);
export const servicesSchema = z.array(serviceSchema);
export const datesSchema = z.array(dateSchema);
export const slotsSchema = z.array(slotSchema);
```

### 4.3 Service module — `src/lib/qmatic.api.ts`

```ts
import { matrix, qmaticGet } from "./qmatic";
import * as S from "./qmatic.schemas";

export const qmatic = {
  branches: async () => S.branchesSchema.parse(await qmaticGet("/branches")),

  servicesAtBranch: async (branchId: string) =>
    S.servicesSchema.parse(await qmaticGet(`/branches/${branchId}/services`)),

  availableDates: async (branchId: string, servicePublicId: string, slotLen: number) =>
    S.datesSchema.parse(
      await qmaticGet(
        matrix(`/branches/${branchId}/dates`, [
          ["servicePublicId", servicePublicId],
          ["customSlotLength", slotLen],
        ]),
      ),
    ),

  availableTimes: async (
    branchId: string, date: string, servicePublicId: string, slotLen: number,
  ) =>
    S.slotsSchema.parse(
      await qmaticGet(
        matrix(`/branches/${branchId}/dates/${date}/times`, [
          ["servicePublicId", servicePublicId],
          ["customSlotLength", slotLen],
        ]),
      ),
    ),
};
```

### 4.4 Domain hooks — `src/hooks/useQmatic.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { qmatic } from "../lib/qmatic.api";

export const useBranches = () =>
  useQuery({ queryKey: ["qmatic", "branches"], queryFn: qmatic.branches });

export const useBranchServices = (branchId?: string) =>
  useQuery({
    queryKey: ["qmatic", "services", branchId],
    queryFn: () => qmatic.servicesAtBranch(branchId!),
    enabled: !!branchId,
  });

export const useAvailableDates = (
  branchId?: string, servicePublicId?: string, slotLen?: number,
) =>
  useQuery({
    queryKey: ["qmatic", "dates", branchId, servicePublicId, slotLen],
    queryFn: () => qmatic.availableDates(branchId!, servicePublicId!, slotLen!),
    enabled: !!branchId && !!servicePublicId && !!slotLen,
  });

export const useAvailableTimes = (
  branchId?: string, date?: string, servicePublicId?: string, slotLen?: number,
) =>
  useQuery({
    queryKey: ["qmatic", "times", branchId, date, servicePublicId, slotLen],
    queryFn: () =>
      qmatic.availableTimes(branchId!, date!, servicePublicId!, slotLen!),
    enabled: !!branchId && !!date && !!servicePublicId && !!slotLen,
  });
```

### CORS / proxying

The API sends standard browser security headers but no explicit
`Access-Control-Allow-Origin`. From a browser on a different origin, calls will
likely be **blocked by CORS**. Options:

- **Proxy through the Brama backend** (`brama-be`) — recommended. Add a thin
  pass-through route (e.g. `GET /api/qmatic/*`) that forwards to the Qmatic base
  and returns JSON. This also lets us cache, rate-limit, and add a custom
  `User-Agent`.
- Vite dev proxy (`server.proxy`) for local development only.

Move `qmaticGet` to the backend if proxying; keep the schemas shared.

---

## 5. Booking (write) flow — out of scope

Documented from the SPA source for completeness. **We do not implement this** —
it creates real appointments in the city's system. Writes require a
`JSESSIONID` session cookie plus an `X-CSRF-Token` header.

```
1. POST /branches/{branchId}/dates/{date}/times/{time}/reserve;customSlotLength=<min>
        body: { services: [{ publicId }], custom: { peopleServices: [...] } }
        headers: { X-CSRF-Token }
        → returns a reserved appointment publicId (held with a timeout)

2. POST /appointments/{publicId}/confirm
        body: { customer: {...}, custom: {...}, notificationType, title }
        headers: { X-CSRF-Token }
        → finalizes the booking

   DELETE /appointments/reserved/{publicId}   # release a held slot
   DELETE /appointments/{publicId}            # cancel a confirmed appointment
   POST   /sendSMS , POST /verifySMS          # phone verification
```

---

## 6. Endpoint reference

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/branches` | All offices | none |
| GET | `/branches/{id}/services` | Services at an office | none |
| GET | `/services;validate=true` | All services | none |
| GET | `/services/{publicId}/branches` | Offices offering a service | none |
| GET | `/branches/available;servicePublicId=…` | Offices for multiple services | none |
| GET | `/serviceGroups` · `/branches/{id}/serviceGroups` | Service categories | none |
| GET | `/branches/{id}/dates;servicePublicId=…;customSlotLength=…` | **Free days** | none |
| GET | `/branches/{id}/dates/{date}/times;servicePublicId=…;customSlotLength=…` | **Free slots** | none |
| GET | `/configuration` · `/uiMessages?lang=` | Config / i18n | none |
| POST | `/branches/{id}/dates/{date}/times/{time}/reserve;…` | Hold a slot | CSRF + session |
| POST | `/appointments/{publicId}/confirm` | Confirm booking | CSRF + session |
| DELETE | `/appointments/reserved/{publicId}` · `/appointments/{id}` | Release / cancel | CSRF + session |

---

## 7. Operational & ethical constraints

- **Read-only.** Use only the `GET` endpoints. Do **not** call `reserve` /
  `confirm` programmatically — that would create real bookings, hold real slots,
  and could deny service to citizens.
- **No official contract.** This is an undocumented, internal API reverse-read
  from the public SPA. Field names, the matrix-param style, and bundle hashes
  (`app.<hash>.js`) **can change without notice**. Validate with Zod, fail
  gracefully, and add a smoke test that re-checks the shapes.
- **Be a good citizen.** Cache aggressively (dates/slots change slowly), avoid
  tight polling, send a clear `User-Agent`, and rate-limit on our proxy. Don't
  hammer a public municipal service.
- **Respect terms & data.** Confirm Lublin's terms of use before shipping.
  Branch `custom` blobs can contain operational notes/messages — surface them to
  users rather than reinterpreting them.

---

## 8. Quick-start checklist

1. Add backend proxy route `GET /api/qmatic/*` → Qmatic base (avoids CORS,
   enables caching/rate-limiting).
2. Add `qmatic.ts`, schemas, `qmatic.api.ts`, and `useQmatic.ts` (Section 4).
3. UI flow: office picker → service picker → date picker → slot list.
4. Add a smoke test asserting `/branches` and one `dates`/`times` round-trip
   still validate against the Zod schemas.
