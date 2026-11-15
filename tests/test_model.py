"""Checks over the whole real dataset: the numbers the page shows are computed by model.py,
and these tests fail when the parser or the joining rules change them unnoticed."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from model import build, check  # noqa: E402

RECORDS = json.loads((ROOT / "data" / "records.json").read_text(encoding="utf-8"))
ALIASES = json.loads((ROOT / "data" / "aliases.json").read_text(encoding="utf-8"))
DATA = build(RECORDS, ALIASES, ROOT / "docs" / "img")


def test_composition_adds_up():
    check(DATA)
    assert len(DATA["items"]) == 331
    assert DATA["status"] == {"periodical": 297, "book": 10, "unread": 15, "none": 9}


def test_population_is_references_plus_clippings_without_one():
    with_ref = sum(1 for r in RECORDS if r["published"])
    clippings_without = sum(1 for r in RECORDS if not r["published"] and r["classification"] == "Zeitungsausschnitte")
    assert (with_ref, clippings_without) == (322, 9)


def test_entities():
    ents = {(e["label"], e["place"]): e for e in DATA["entities"]}
    assert len(DATA["entities"]) == 94
    fz = ents[("Frankfurter Zeitung", "Frankfurt am Main")]
    assert fz["count"] == 11 and len(fz["placeForms"]) == 4
    assert ents[("Der Morgen", "Berlin")]["split"] and ents[("Der Morgen", "Wien")]["split"]
    assert ents[("Neue Freie Presse", "Wien")]["count"] == 82
    assert ents[("Berliner Tageblatt", "Berlin")]["titleForms"] == {"Berliner Tageblatt": 29, "Berliner Tagblatt": 1}


def test_site_data_is_current():
    built = json.loads((ROOT / "docs" / "data" / "clippings.json").read_text(encoding="utf-8"))
    assert built["status"] == DATA["status"]
    assert [e["count"] for e in built["entities"]] == [e["count"] for e in DATA["entities"]]


def test_export_matches_page_counts():
    from export import rows
    built = json.loads((ROOT / "docs" / "data" / "clippings.json").read_text(encoding="utf-8"))
    clippings, register = rows(built)
    assert len(clippings) == len(built["items"]) == 331
    assert len(register) == len(built["entities"]) == 94
    per = [r for r in clippings if r["kind"] == "periodical"]
    assert len(per) == sum(r["clippings"] for r in register) == built["status"]["periodical"]
    assert {r["status"] for r in clippings} == {"proposal"}
    on_disk = json.loads((ROOT / "docs" / "data" / "export" / "clippings-modelled.json").read_text(encoding="utf-8"))
    assert on_disk["rows"] == clippings and "CC BY-NC 4.0" in on_disk["licence"]
