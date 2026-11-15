"""Rule invariants over the whole real dataset (review of 2026-11-15)."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from model import build  # noqa: E402

RECORDS = json.loads((ROOT / "data" / "records.json").read_text(encoding="utf-8"))
ALIASES = json.loads((ROOT / "data" / "aliases.json").read_text(encoding="utf-8"))
DATA = build(RECORDS, ALIASES, ROOT / "docs" / "img")
PLACED = [it for it in DATA["items"] if it["status"] == "periodical"]
MONTHS = ["januar|jänner", "februar", "märz", "april", "mai", "juni", "juli", "august",
          "september", "oktober", "november", "dezember"]


def supplement_mixes(data):
    """Periodicals that join a catalogue line with "Beilage" and one without (data.md: a supplement stays its own)."""
    bad = []
    for e in data["entities"]:
        lines = {f"{it['written']}, {it['placeWritten'] or ''}" for it in data["items"] if it.get("entity") == e["id"]}
        if any("Beilage" in f for f in lines) and any("Beilage" not in f for f in lines):
            bad.append(e["label"])
    return bad


def test_supplement_is_not_joined_into_its_paper():
    assert supplement_mixes(DATA) == []


def test_place_alias_applies_only_to_the_titles_its_reason_names():
    labels = {e["label"] for e in DATA["entities"]}
    for written, a in ALIASES["places"].items():
        named = [lab for lab in labels if lab in a["reason"]]
        if named:
            assert set(named) <= set(a.get("titles", [])), (written, named)
    for it in PLACED:
        for d in it["decisions"]:
            if d["kind"] == "alias" and d["text"].startswith("place"):
                written = d["text"].split("“")[1].split("”")[0]
                scope = ALIASES["places"][written].get("titles")
                if scope:
                    assert it["written"] in scope, (it["written"], written)


def test_written_title_and_place_stand_in_the_catalogue_line():
    for it in PLACED:
        assert it["written"] in it["raw"], it["raw"]
        if it["placeWritten"]:
            assert it["placeWritten"] in it["raw"], it["raw"]


def test_date_can_be_found_in_the_catalogue_line():
    for it in PLACED:
        d, raw = it["date"], it["raw"]
        assert str(d["year"]) in raw, raw
        if "day" in d:
            assert re.search(rf"\b0?{d['day']}\.\s*(0?{d['month']}\.|{MONTHS[d['month'] - 1]})", raw, re.I), raw
        elif "month" in d:
            assert re.search(rf"{MONTHS[d['month'] - 1]}|\b0?{d['month']}\.", raw, re.I), raw


def test_rail_counts():
    c = DATA["counts"]
    assert sum(c["places"].values()) == len(PLACED)
    assert c["notPlaced"] == len(DATA["items"]) - len(PLACED)
    for kind, n in c["cases"].items():
        assert n == sum(1 for it in DATA["items"] if kind in it["cases"]), kind
    # A clipping counts under "forms joined" only if its own line was changed by fold or alias.
    nfp = [it for it in PLACED if it["written"] == "Neue Freie Presse"]
    assert sum(1 for it in nfp if "joined" in it["cases"]) == 0
