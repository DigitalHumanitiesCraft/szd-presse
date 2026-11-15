"""Turn parsed catalogue strings into periodical entities and write the site data.

Three kinds of step, each recorded on the item it touches so the page can show it:
  fold     automatic rule: case, leading article and the spelling "Litteratur" are ignored
  alias    editorial decision from data/aliases.json, with its reason
  split    one title written with two different places is taken as two periodicals
  infer    a reference without place takes the place of the only periodical of that title
"""

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parse_published import parse  # noqa: E402

ARTICLES = re.compile(r"^(der|die|das|the|le|la|les|l')\s*", re.IGNORECASE)
FOLD_RULE = "case, a leading article and the spelling Litteratur/Literatur are ignored"


def title_key(title: str) -> str:
    return ARTICLES.sub("", title.lower()).replace("litteratur", "literatur").strip()


def city_group(place: str | None) -> str:
    return place if place in ("Wien", "Berlin") else ("other" if place else "unknown")


def build(records: list[dict], aliases: dict, image_dir: Path) -> dict:
    items = []
    for rec in records:
        if not rec["published"] and rec["classification"] != "Zeitungsausschnitte":
            continue
        parsed = parse(rec["published"]) if rec["published"] else {"status": "none"}
        item = {
            "pid": rec["pid"], "signature": rec["signature"], "title": rec["title"],
            "raw": rec["published"], "status": parsed["status"], "decisions": [],
            "image": (image_dir / f"{rec['pid'].replace(':', '_')}.jpg").exists(),
        }
        if parsed["status"] == "periodical":
            written = parsed["periodical"]
            title = written
            if written in aliases["titles"]:
                a = aliases["titles"][written]
                title = a["to"]
                item["decisions"].append({"kind": "alias", "text": f"title “{written}” read as “{title}”: {a['reason']}"})
            place = parsed["place"]
            if place in aliases["places"]:
                a = aliases["places"][place]
                item["decisions"].append({"kind": "alias", "text": f"place “{place}” read as “{a['to']}”: {a['reason']}"})
                place = a["to"]
            item.update(written=written, canon=title, key=title_key(title), place=place, placeWritten=parsed["place"],
                        date=parsed["date"], pages=parsed["pages"], issue=parsed["issue"])
        items.append(item)

    by_key = defaultdict(list)
    for it in items:
        if it["status"] == "periodical":
            by_key[it["key"]].append(it)

    entities = {}
    for key, group in by_key.items():
        places = sorted({it["place"] for it in group if it["place"]})
        for it in group:
            if it["place"] is None and len(places) == 1:
                it["place"] = places[0]
                it["decisions"].append({"kind": "infer", "text": f"no place written; {places[0]} taken from the other references to this periodical"})
            if len(places) > 1:
                it["decisions"].append({"kind": "split", "text": f"this title appears with {len(places)} places ({', '.join(places)}); taken as {len(places)} periodicals"})
            eid = f"{key}|{it['place'] or ''}"
            it["entity"] = eid
            entities.setdefault(eid, []).append(it)

    out_entities = []
    for eid, group in entities.items():
        forms = Counter(it["written"] for it in group)
        place_forms = Counter(it["placeWritten"] or "(no place)" for it in group)
        label = Counter(it["canon"] for it in group).most_common(1)[0][0]
        out_entities.append({
            "id": eid, "label": label, "place": group[0]["place"], "city": city_group(group[0]["place"]),
            "count": len(group), "titleForms": dict(forms), "placeForms": dict(place_forms),
            "merged": len(forms) > 1 or len(place_forms) > 1,
            "split": any(d["kind"] == "split" for it in group for d in it["decisions"]),
            "years": sorted(it["date"]["year"] for it in group),
        })
    out_entities.sort(key=lambda e: (-e["count"], e["label"]))

    for it in items:
        it.pop("key", None)
        it.pop("canon", None)
    status = Counter(it["status"] for it in items)
    return {"foldRule": FOLD_RULE, "items": items, "entities": out_entities, "status": dict(status)}


def check(data: dict) -> None:
    """Composition check: every item sits in exactly one status group and one entity at most."""
    items = data["items"]
    assert len({it["pid"] for it in items}) == len(items), "duplicate pid"
    assert sum(data["status"].values()) == len(items)
    per = [it for it in items if it["status"] == "periodical"]
    assert sum(e["count"] for e in data["entities"]) == len(per)
    assert all(it.get("entity") for it in per)
    assert all("entity" not in it for it in items if it["status"] != "periodical")


def main(records_path: Path, aliases_path: Path, image_dir: Path, out: Path) -> None:
    records = json.loads(records_path.read_text(encoding="utf-8"))
    data = build(records, json.loads(aliases_path.read_text(encoding="utf-8")), image_dir)
    check(data)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(data["items"]), data["status"], len(data["entities"]), "periodicals")


if __name__ == "__main__":
    main(*(Path(a) for a in sys.argv[1:5]))
