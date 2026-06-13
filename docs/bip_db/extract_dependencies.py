#!/usr/bin/env python3
"""
Derive a dependency layer over the BIP Lublin service catalog.

Reads services.jsonl and emits dependencies.json with two edge kinds:

  requires_internal_service  -> the prerequisite is a document the resident must
                                first obtain from ANOTHER Lublin city-hall service.
                                Both ends are cards we hold, so this is navigable
                                (tappable next step in the app).

  requires_external_doc      -> the prerequisite comes from an institution OUTSIDE
                                the city catalog (ZUS, Urząd Skarbowy, KRUS, ...).
                                We have no card to link to, so this is a flat,
                                informational label only ("you will also need X
                                from Y") to set expectations.

Matching is deliberately conservative: we only emit an internal edge when a
consumer's requirement text contains a phrase that maps to a known producer
service pattern, and a producer card actually exists in the catalog.
"""
import json
import re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
SERVICES = HERE / "services.jsonl"
OUT = HERE / "dependencies.json"

# ---------------------------------------------------------------------------
# External institutions (NOT in our catalog -> informational label only)
# ---------------------------------------------------------------------------
EXTERNAL_OFFICES = {
    "ZUS": {
        "label": "Zakład Ubezpieczeń Społecznych (ZUS)",
        # \bZUS\b or full name; ZUA/ZZA are ZUS form codes
        "pattern": r"\bZUS\b|Zakład\w* Ubezpieczeń Społecznych",
    },
    "KRUS": {
        "label": "Kasa Rolniczego Ubezpieczenia Społecznego (KRUS)",
        "pattern": r"\bKRUS\b",
    },
    "US": {
        "label": "Urząd Skarbowy",
        # tax office, but NOT "opłata skarbowa" (stamp duty) -> require the word
        # skarbow* to be preceded by a form of "urząd" / "naczelnik"
        "pattern": r"(?:urzęd\w*|urząd\w*|naczelnik\w*)\s+(?:właściw\w*\s+)?(?:urzęd\w*\s+)?skarbow\w*|\bUrzędzie\s+Skarbowym\b|\bPIT[- ]?\d",
    },
    "PUP": {
        "label": "Powiatowy Urząd Pracy",
        "pattern": r"urzęd\w* pracy|\bPUP\b",
    },
    "MOPR": {
        "label": "Miejski Ośrodek Pomocy Rodzinie (MOPR)",
        "pattern": r"\bMOPR\b|ośrod\w* pomocy rodzinie",
    },
}

# ---------------------------------------------------------------------------
# Internal documents: a prerequisite phrase (seen in a CONSUMER's requirement
# text) -> a regex that identifies the PRODUCER service by its name.
# We resolve the producer regex against the catalog at runtime so we never
# point at a card that doesn't exist.
# ---------------------------------------------------------------------------
INTERNAL_DOCS = [
    {
        "key": "odpis_aktu",
        "doc": "Odpis aktu stanu cywilnego (urodzenia / małżeństwa / zgonu)",
        # consumer mentions an odpis aktu ...
        "consumer": r"odpis\w*\s+(?:skrócon\w*|zupełn\w*|aktu)\s*(?:aktu\s+)?(?:urodzenia|małżeństwa|zgonu)",
        # produced by USC services about issuing odpis / zaświadczenie z rejestru stanu cywilnego
        "producer_name": r"odpis\w*\s+aktu|zaświadczeń?.*stanu cywilnego|akt\w* stanu cywilnego",
        "producer_komorka": "Urząd Stanu Cywilnego",
    },
    {
        "key": "wypis_ewidencja_gruntow",
        "doc": "Wypis / wyrys z ewidencji gruntów i budynków",
        "consumer": r"wypis\w*(?:\s+i\s+wyrys\w*)?\s+z\s+(?:operatu\s+)?ewiden\w* grunt|wyrys\w*\s+z\s+(?:mapy\s+)?ewiden",
        "producer_name": r"wypis\w*.*ewiden|wyrys\w*.*ewiden|ewiden\w* grunt",
        "producer_komorka": "Wydział Geodezji",
    },
    {
        "key": "wypis_mpzp",
        "doc": "Wypis i wyrys z miejscowego planu zagospodarowania przestrzennego",
        "consumer": r"wypis\w*(?:\s+i\s+wyrys\w*)?\s+z\s+(?:miejscowego\s+)?planu zagospodarowania|zaświadcz\w*.*planu zagospodarowania|\bMPZP\b",
        "producer_name": r"plan\w* (miejscow\w*|zagospodarowania)|wypis\w*.*planu|zaświadcz\w*.*planu",
        "producer_komorka": "Wydział Planowania",
    },
    {
        "key": "warunki_zabudowy",
        "doc": "Decyzja o warunkach zabudowy",
        "consumer": r"decyzj\w*\s+o\s+warunkach zabudowy|warunk\w* zabudowy",
        "producer_name": r"warunk\w* zabudowy",
        "producer_komorka": "Wydział Planowania",
    },
    {
        "key": "pozwolenie_budowa",
        "doc": "Pozwolenie na budowę",
        "consumer": r"pozwoleni\w* na budowę",
        "producer_name": r"pozwoleni\w* na budowę",
        "producer_komorka": "Wydział Architektury i Budownictwa",
    },
    {
        "key": "zaswiadczenie_zameldowanie",
        "doc": "Zaświadczenie o zameldowaniu / dane z rejestru mieszkańców (PESEL)",
        "consumer": r"zaświadcz\w*\s+o\s+zameldowan|potwierdzenie zameldowania|zaświadcz\w*.*rejestru mieszkańców",
        "producer_name": r"zaświadcz\w*.*zameldowan|zaświadcz\w*.*rejestru mieszkańców|udostępni\w*.*danych.*rejestr",
        "producer_komorka": "Wydział Spraw Administracyjnych",
    },
]


def load_services():
    return [json.loads(l) for l in open(SERVICES, encoding="utf-8")]


# Cards that modify/correspond about a decision rather than ISSUE the original
# document the resident actually needs -> rank last.
DEPRIORITIZE_RE = re.compile(
    r"^(zmiana|przeniesienie|uzupełnienie|korekta|wniosek o przeniesienie|"
    r"wznowienie|pisma|uzgodnienie)",
    re.I,
)
# Verbs that denote ISSUING a document -> rank first (above e.g. "Zaświadczenie ...").
ISSUANCE_RE = re.compile(
    r"^(wydawanie|wydanie|wypis|wyrys|odpis|pozwolenie|ustalenie)",
    re.I,
)


def resolve_producers(svcs, name_pat, komorka_hint):
    out = []
    for s in svcs:
        if komorka_hint and komorka_hint not in s["komorka"]:
            continue
        if re.search(name_pat, s["nazwa"], re.I):
            primary = not bool(DEPRIORITIZE_RE.match(s["nazwa"]))
            out.append(
                {
                    "id": s["id"],
                    "nazwa": s["nazwa"],
                    "komorka": s["komorka"],
                    "primary": primary,
                    "_issues": bool(ISSUANCE_RE.match(s["nazwa"])),
                }
            )
    # rank: not-deprioritized first, then issuance verbs, then shortest (canonical)
    out.sort(key=lambda p: (not p["primary"], not p["_issues"], len(p["nazwa"])))
    for p in out:
        p.pop("_issues", None)
    return out


def snippet(text, pat, width=70):
    m = re.search(pat, text, re.I)
    if not m:
        return None
    s = max(0, m.start() - width)
    e = min(len(text), m.end() + width)
    return ("…" + text[s:e] + "…").replace("\n", " ").strip()


def main():
    svcs = load_services()
    by_id = {s["id"]: s for s in svcs}

    # Pre-resolve producers for each internal doc type
    producers = {}
    for doc in INTERNAL_DOCS:
        producers[doc["key"]] = resolve_producers(
            svcs, doc["producer_name"], doc["producer_komorka"]
        )

    nodes = []
    ext_counter = defaultdict(int)
    int_counter = defaultdict(int)

    for s in svcs:
        text = s["text"]
        external = []
        internal = []

        # external offices
        for code, cfg in EXTERNAL_OFFICES.items():
            if re.search(cfg["pattern"], text, re.I):
                external.append(
                    {
                        "office": code,
                        "label": cfg["label"],
                        "evidence": snippet(text, cfg["pattern"]),
                    }
                )
                ext_counter[code] += 1

        # internal cross-department edges
        for doc in INTERNAL_DOCS:
            if not re.search(doc["consumer"], text, re.I):
                continue
            # don't link a service to itself / its own department's identical card
            targets = [
                p for p in producers[doc["key"]] if p["id"] != s["id"]
            ]
            if not targets:
                continue
            internal.append(
                {
                    "doc_key": doc["key"],
                    "document": doc["doc"],
                    "evidence": snippet(text, doc["consumer"]),
                    "produced_by": targets,
                }
            )
            int_counter[doc["key"]] += 1

        if external or internal:
            nodes.append(
                {
                    "id": s["id"],
                    "nazwa": s["nazwa"],
                    "komorka": s["komorka"],
                    "url": s.get("url", ""),
                    "requires_external_doc": external,
                    "requires_internal_service": internal,
                }
            )

    result = {
        "summary": {
            "total_services": len(svcs),
            "services_with_dependencies": len(nodes),
            "external_office_hits": dict(sorted(ext_counter.items(), key=lambda x: -x[1])),
            "internal_doc_hits": dict(sorted(int_counter.items(), key=lambda x: -x[1])),
            "producers_resolved": {k: len(v) for k, v in producers.items()},
        },
        "services": nodes,
    }

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
