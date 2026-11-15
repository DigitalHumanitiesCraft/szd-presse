"""Write the modelled data as the tool's output: one row per clipping and a register of periodicals,
each as CSV and JSON, from the site data that the page itself loads (docs/data/clippings.json).

Every row carries its review state. Today every statement is a proposal made by the parser and the
joining rules; no person has confirmed anything, and the files say so.
"""

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

LICENCE = ("Derived from the catalogue of the Aufsatzablage, Stefan Zweig Digital, Literaturarchiv Salzburg, "
           "CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/). Machine-parsed proposals, not verified.")

CLIPPING_FIELDS = ["signature", "pid", "kind", "periodical_id", "periodical_label", "place", "date",
                   "issue", "pages", "catalogue_line", "rules_applied", "status", "status_by", "gams_url"]
REGISTER_FIELDS = ["periodical_id", "label", "place", "clippings", "catalogue_title_forms",
                   "catalogue_place_forms", "status", "status_by"]


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def periodical_id(entity_id: str) -> str:
    key, place = entity_id.split("|", 1)
    return f"{slug(key)}--{slug(place) or 'no-place'}"


def iso_date(d: dict | None) -> str:
    if not d:
        return ""
    parts = [f"{d['year']:04d}"] + [f"{d[k]:02d}" for k in ("month", "day") if k in d]
    return "-".join(parts)


def rows(data: dict) -> tuple[list[dict], list[dict]]:
    ents = {e["id"]: e for e in data["entities"]}
    clippings = []
    for it in data["items"]:
        e = ents.get(it.get("entity"))
        rules = ["parse"] if it["raw"] else []
        title_alias = any(d["kind"] == "alias" and d["text"].startswith("title") for d in it["decisions"])
        if e and it.get("written") != e["label"] and not title_alias:
            rules.append("fold: " + data["foldRule"])
        rules += [f"{d['kind']}: {d['text']}" for d in it["decisions"]]
        clippings.append({
            "signature": it["signature"], "pid": it["pid"], "kind": it["status"],
            "periodical_id": periodical_id(e["id"]) if e else "", "periodical_label": e["label"] if e else "",
            "place": (e["place"] or "") if e else "", "date": iso_date(it.get("date")),
            "issue": it.get("issue") or "", "pages": it.get("pages") or "", "catalogue_line": it["raw"],
            "rules_applied": " | ".join(rules), "status": "proposal", "status_by": "rule (parser and joining rules)",
            "gams_url": f"https://gams.uni-graz.at/{it['pid']}",
        })
    register = [{
        "periodical_id": periodical_id(e["id"]), "label": e["label"], "place": e["place"] or "",
        "clippings": e["count"],
        "catalogue_title_forms": " | ".join(f"{f} ({n})" for f, n in e["titleForms"].items()),
        "catalogue_place_forms": " | ".join(f"{f} ({n})" for f, n in e["placeForms"].items()),
        "status": "proposal", "status_by": "rule (parser and joining rules)",
    } for e in data["entities"]]
    return clippings, register


def write(path: Path, fields: list[str], table: list[dict]) -> None:
    with path.with_suffix(".csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(table)
    doc = {"licence": LICENCE, "rows": table}
    path.with_suffix(".json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")


def main(site_data: Path, out_dir: Path) -> None:
    data = json.loads(site_data.read_text(encoding="utf-8"))
    clippings, register = rows(data)
    assert len({r["periodical_id"] for r in register}) == len(register), "periodical ids collide"
    out_dir.mkdir(parents=True, exist_ok=True)
    write(out_dir / "clippings-modelled", CLIPPING_FIELDS, clippings)
    write(out_dir / "periodicals-register", REGISTER_FIELDS, register)
    (out_dir / "LICENCE.txt").write_text(LICENCE + "\n", encoding="utf-8")
    print(len(clippings), "clippings,", len(register), "periodicals ->", out_dir)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
