"""Possible same periodical (stage 2): stated criteria, nothing joined, and the city counts."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from candidates import find, unread_cause  # noqa: E402
from model import build  # noqa: E402

RECORDS = json.loads((ROOT / "data" / "records.json").read_text(encoding="utf-8"))
ALIASES = json.loads((ROOT / "data" / "aliases.json").read_text(encoding="utf-8"))
DATA = build(RECORDS, ALIASES, ROOT / "docs" / "img")
CANDS = find(DATA)
ENTS = {e["id"]: e for e in DATA["entities"]}
ITEMS = {it["pid"]: it for it in DATA["items"]}


def pairs(criterion):
    return {(c["a"], c["b"]) for c in CANDS if c["criterion"] == criterion}


def test_supplements_beside_their_paper():
    got = {(ENTS[a]["label"], ENTS[b]["label"]) for a, b in pairs("supplement")}
    assert got == {("Beilage des Berliner Börsen-Couriers", "Berliner Börsen-Courier"),
                   ("Sonntags-Beilage der National-Zeitung", "National-Zeitung"),
                   ("Allgemeine Zeitung (Beilage)", "Allgemeine Zeitung")}


def test_combined_title():
    assert {(ENTS[a]["label"], ENTS[b]["label"]) for a, b in pairs("combined")} == {("Die weite Welt/Vom Fels zum Meer", "Vom Fels zum Meer")}


def test_unparsed_lines_beginning_with_a_known_title():
    got = sorted(ENTS[b]["label"] for a, b in pairs("prefix"))
    assert got == sorted(["Neue Freie Presse", "Frankfurter Zeitung", "Berliner Tageblatt", "Der Merker", "Pester Lloyd"])
    assert all(ITEMS[a]["status"] == "unread" for a, _ in pairs("prefix"))


def test_no_near_identical_keys_and_no_suspicion_without_a_criterion():
    assert pairs("near") == set()
    named = {ENTS[x]["label"] for c in CANDS for x in (c["a"], c["b"]) if x in ENTS}
    assert "Münchner Allgemeine Zeitung" not in named


def test_candidates_join_nothing():
    assert len(DATA["entities"]) == 94
    assert DATA["status"] == {"periodical": 297, "book": 10, "unread": 15, "none": 9}


def test_unread_causes():
    causes = {ITEMS[p]["raw"]: unread_cause(ITEMS[p]["raw"]) for p in ITEMS if ITEMS[p]["status"] == "unread"}
    assert [r for r, c in causes.items() if c == "no-periodical"] == ["S. 19–23"]


def test_city_counts():
    c = DATA["counts"]["cities"]
    assert sum(c.values()) == 297
    assert c["Wien"] == 112 and c["Berlin"] == 90
    swiss = ["Zürich", "Basel", "Genf", "Bern"]
    assert sum(c[x] for x in swiss) == 17
    swiss_periodicals = {e["label"] for e in DATA["entities"] if e["place"] in swiss}
    assert len(swiss_periodicals) == 7
