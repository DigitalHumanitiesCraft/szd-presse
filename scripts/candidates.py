"""Possible same periodical: pairs that no rule joins and an expert would have to decide.

Every candidate comes from one stated criterion; nothing here joins anything, the data and the
counts stay as they are. Criteria:
  supplement   a supplement and a periodical whose title the supplement names, in the same place
               ("Beilage des Berliner Börsen-Couriers" beside "Berliner Börsen-Courier")
  combined     a title written as two titles joined by "/" beside one of its parts
  prefix       a line not parsed whose text begins with a title already in the register
  near         two title keys within edit distance 2 (both at least six letters), not already joined
Lines not parsed are further told apart by cause: a title is known but the date or issue was not
read, or no periodical is named.
"""

import re

from model import title_key

SUPP = re.compile(r"^(?:.*?Beilage\s+(?:des|der|zu)\s+)(?P<base>.+)$|^(?P<base2>.+?)\s*\(Beilage\)$", re.IGNORECASE)


def _genitive_match(a: str, b: str) -> bool:
    return a == b or a in (b + "s", b + "es") or b in (a + "s", a + "es")


def _lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def unread_cause(raw: str) -> str:
    head = raw.split(",", 1)[0].strip()
    if not head or re.match(r"^(S\.|Sp\.|Seite)\s*\d", head):
        return "no-periodical"
    return "date-unread"


def find(data: dict) -> list[dict]:
    ents = data["entities"]
    key = {e["id"]: e["id"].split("|", 1)[0] for e in ents}
    out = []

    for s in ents:
        m = SUPP.match(s["label"])
        if not m or "beilage" not in s["label"].lower():
            continue
        base = title_key(m.group("base") or m.group("base2"))
        for e in ents:
            if e["id"] != s["id"] and "beilage" not in e["label"].lower() and _genitive_match(base, key[e["id"]]) \
                    and (e["place"] == s["place"] or not e["place"] or not s["place"]):
                out.append({"criterion": "supplement", "a": s["id"], "b": e["id"]})

    for c in ents:
        if "/" not in c["label"]:
            continue
        parts = {title_key(p) for p in c["label"].split("/")}
        for e in ents:
            if e["id"] != c["id"] and key[e["id"]] in parts:
                out.append({"criterion": "combined", "a": c["id"], "b": e["id"]})

    labels = sorted(ents, key=lambda e: len(e["label"]), reverse=True)
    for it in data["items"]:
        if it["status"] != "unread":
            continue
        low = it["raw"].lower()
        hit = next((e for e in labels if low.startswith(e["label"].lower() + ",")), None)
        if hit:
            out.append({"criterion": "prefix", "a": it["pid"], "b": hit["id"]})

    seen = sorted({key[e["id"]] for e in ents})
    for i, a in enumerate(seen):
        for b in seen[i + 1:]:
            if min(len(a), len(b)) >= 6 and _lev(a, b) <= 2:
                ea = next(e for e in ents if key[e["id"]] == a)
                eb = next(e for e in ents if key[e["id"]] == b)
                out.append({"criterion": "near", "a": ea["id"], "b": eb["id"]})
    return out
