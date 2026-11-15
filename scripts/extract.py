"""Extract one flat record per biblFull from the Aufsatzablage TEI (read-only on the source)."""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

TEI = "{http://www.tei-c.org/ns/1.0}"
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"


def norm(text: str | None) -> str:
    return " ".join((text or "").split())


def first(el: ET.Element, path: str) -> str:
    found = el.find(path)
    return norm("".join(found.itertext())) if found is not None else ""


def extract(bf: ET.Element) -> dict:
    classification = next(
        (norm(t.text) for t in bf.iter(f"{TEI}term")
         if t.get("type") == "classification" and t.get(XML_LANG) == "de"),
        "",
    )
    persons = [
        {"name": norm("".join(t.itertext())), "ref": t.get("ref") or ""}
        for t in bf.iter(f"{TEI}term") if t.get("type") == "person"
    ]
    orig_date = bf.find(f".//{TEI}origDate")
    date = {}
    if orig_date is not None:
        date = {k: v for k, v in orig_date.attrib.items() if k in ("when", "from", "to", "notBefore", "notAfter")}
        date["text"] = norm("".join(orig_date.itertext()))
    return {
        "id": bf.get(f"{{http://www.w3.org/XML/1998/namespace}}id"),
        "pid": first(bf, f".//{TEI}idno[@type='PID']"),
        "signature": first(bf, f".//{TEI}idno[@type='signature']"),
        "title": first(bf, f".//{TEI}titleStmt/{TEI}title"),
        "classification": classification,
        "published": first(bf, f".//{TEI}bibl[@type='published']"),
        "origPlace": first(bf, f".//{TEI}origPlace"),
        "origDate": date,
        "lang": [l.get(XML_LANG) for l in bf.iter(f"{TEI}lang")],
        "persons": persons,
    }


def main(src: Path, out: Path) -> None:
    root = ET.parse(src).getroot()
    records = [extract(bf) for bf in root.iter(f"{TEI}biblFull")]
    out.write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(records)} records -> {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
