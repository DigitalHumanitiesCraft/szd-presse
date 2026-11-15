---
title: Data of Zweig Press Clippings
project: {name: szd-presse, repository: https://github.com/DigitalHumanitiesCraft/szd-presse}
method: {name: Promptotyping, url: https://dhcraft.org/Promptotyping/}
status: draft
language: en
created: 2026-11-15
updated: 2026-11-15
generated-with: Claude Code (Claude Opus 5.5)
template: data
---

# Data

What the instrument is built from, how the catalogue line becomes a periodical, and where the reading stops.

## Subject

The Aufsatzablage of the Stefan Zweig estate: Zweig's own collection of press clippings, index sheets and working material. The instrument takes every record that carries a publication reference (`bibl[@type='published']`) plus the records classified as Zeitungsausschnitte that carry none. Counts are computed by `scripts/model.py` and pinned in `tests/test_model.py`.

## Sources

- `data/source_aufsatzablage_tei.xml`: unchanged copy of `szd-htr/data/szd_aufsatzablage_tei.xml` at `szd-htr` commit `913fb40`. The TEI header states the licence CC BY-NC 4.0, publisher Literaturarchiv Salzburg.
- `data/records.json`: one flat record per `biblFull`, written by `scripts/extract.py`.
- `docs/img/`: first facsimile page (`IMG.1`) per object from `https://gams.uni-graz.at/{pid}/IMG.1`, reduced to 640 px on the long side by `scripts/fetch_facsimiles.py`. Licence: the imprint of stefanzweig.digital states "Alle Inhalte lizenziert unter Creative Commons BY 4.0" (read 2026-11-15); the METS rights block of each object names "Literaturarchiv Salzburg, https://stefanzweig.digital, CC-BY". Four objects return 404 for `IMG.1` (`data/facsimile_failures.json`) and show only the link.
- IIIF, checked 2026-11-15 (this corrects the Phase 1 report, which had not tried the path): GAMS serves the IIIF Image API 2, level 2, at `https://gams.uni-graz.at/iiif/{pid}/IMG.{n}/info.json`, and a IIIF Presentation 2 manifest per object at `https://gams.uni-graz.at/{pid}/sdef:IIIF/getManifest` (redirects to `cocoon/mets2json`); both answer with `Access-Control-Allow-Origin: *`. The manifest's attribution reads "Literaturarchiv Salzburg, https://stefanzweig.digital, CC-BY"; its `license` field is empty. The info.json carries no `tiles` and an empty `sizes` list, so `docs/viewer.js` adds a tile grid before opening. Paths that answered otherwise: `{pid}/IMG.1/info.json` 500, `iiif/2/...` 404, `{pid}/manifest.json` 404, `iiif/manifest/{pid}` 404. No GAMS documentation page on IIIF was read; the finding rests on these responses.

## Deliberate choice: images loaded from the archive at view time

The deep-zoom viewer loads the manifest and image tiles from GAMS when a reader opens it, so a public page hotlinks the archive's server. Alternative: generate static tiles locally (for instance with a IIIF level 0 tiler) and serve them with the site, which removes the load on GAMS and the dependency on its availability at the cost of several hundred megabytes in the repository and a copy of the archive's images on another server. Chosen because the archive offers IIIF with open CORS for exactly this use and the reduced local image remains as the fallback. The question of third-party rights in the printed texts stays as stated under Limits.

## Model

1. Parse (`scripts/parse_published.py`, deterministic, no LLM). A line becomes periodical, place, date (day, month or year), page and issue. Status `periodical` requires a date with at least a month, or an issue designation with a year. Status `book` when a publisher colon, an editor marker, `Verlag`, `Privatdruck` or `jun.` occurs. Everything else is `unread`: typing errors in dates (`17. 10 1920`), date ranges, `o. D.`, a bare year without an issue, lines without a title. Unread lines are kept and shown, never guessed.
2. Join (`scripts/model.py`).
   - fold: case, a leading article and the spelling Litteratur/Literatur are ignored.
   - alias: editorial decisions in `data/aliases.json`, each with its reason (five title forms, nine place forms).
   - split: one title written with two places is taken as two periodicals (Der Morgen, Berlin and Wien).
   - infer: a line without place takes the place of the only periodical of that title.
   Every step is recorded on the item it touches and shown in the instrument.

## Limits

- All parsed fields and joins are proposals (agent, 2026-11-15). Nothing has been checked against the facsimiles.
- The joins are string-level. No authority file (GND, ZDB) is matched; a supplement (Beilage) stays a periodical of its own.
- Multi-place imprints (`Wien und Leipzig`) are reduced to the first place, a stated simplification.
- The catalogue's `origDate` was not used; dates come from the publication line only.
- Facsimiles show third-party texts as well as Zweig's. The CC BY statement is the archive's; whether it covers every printed text it reproduces is not established here.
