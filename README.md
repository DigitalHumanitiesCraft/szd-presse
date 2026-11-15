# Zweig Press Clippings

A research tool that carries catalogue data into a modelled schema. Stefan Zweig kept a collection of press clippings, catalogued by the Literaturarchiv Salzburg with one line of free text for where each piece appeared. In the view Normalise, stated rules propose how these lines join into periodicals with place and date; the cases a text cannot decide come first, every join, inference and line left unread is shown, and a deep-zoom viewer fed by the archive's IIIF service puts the facsimile beside the proposal. The view Explore shows the modelled clippings by periodical and year. The modelled data and a register of the periodicals can be downloaded; every statement in them is a proposal by rule until a person confirms it.

## Addresses

- Published tool: https://dhcraft.org/szd-presse/ (GitHub Pages from `main`, folder `docs/`)
- Repository: https://github.com/DigitalHumanitiesCraft/szd-presse

## Run locally

```bash
python -m http.server 8731 --directory docs
```

Then open http://localhost:8731/.

## Rebuild the data

```bash
python scripts/extract.py data/source_aufsatzablage_tei.xml data/records.json
python scripts/model.py data/records.json data/aliases.json docs/img docs/data/clippings.json
python scripts/export.py docs/data/clippings.json docs/data/export
python -m pytest tests
node tests/ui/keyboard.cjs   # browser checks against the local server, needs Playwright
BASE=https://dhcraft.org/szd-presse/ node tests/ui/viewer.cjs   # the same checks against the published page
```

`scripts/candidates.py` proposes possible same periodicals by stated criteria without joining them; the export writes them to `docs/data/export/candidates-same-periodical.*`.

`scripts/fetch_facsimiles.py` downloads and reduces the first facsimile page of each clipping from GAMS; it skips files already present.

## Layout

- `docs/` is the site and the only folder meant to be served.
- `scripts/` parse and model the catalogue; no language model is involved.
- `data/` holds the source copy, the extracted records and the editorial joins with their reasons.
- `knowledge/` documents project, data, specification, design and journal.

## Status

Research prototype, built with coding agents following [Promptotyping](https://dhcraft.org/Promptotyping/). Parsed fields and joins are machine-made proposals and have not been checked against the facsimiles.

## Licence

- Code: MIT, see `LICENSE`.
- Text and documentation: CC BY 4.0, see `LICENSE-TEXT.md`.
- Shared web files in `docs/assets/dhcraft/`: MIT; fonts under the SIL Open Font License; the DHCraft logo is not licensed for reuse.
- OpenSeadragon 6.0.2 in `docs/vendor/openseadragon/`: BSD 3-Clause, see its `LICENSE.txt` and `PROVENANCE.md`.
- The deep-zoom viewer loads images at view time from the IIIF service of GAMS (University of Graz); they are not part of this repository.
- Catalogue data (`data/source_aufsatzablage_tei.xml` and what is derived from it): Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY-NC 4.0 as stated in the TEI header.
- Facsimiles in `docs/img/`: Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY 4.0 as stated in the imprint of stefanzweig.digital, reduced in size.
- Two points are open and stated here deliberately: the catalogue data and everything derived from them stand under CC BY-NC 4.0 as the TEI header says, which differs from the CC BY 4.0 of the imprint; and the clippings print texts by third parties whose rights the archive's CC BY statement may not cover, which has not been established.
