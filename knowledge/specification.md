---
title: Specification of Zweig Press Clippings
project: {name: szd-presse, repository: local, not yet published}
method: {name: Promptotyping, url: https://dhcraft.org/Promptotyping/}
status: draft
language: en
created: 2026-11-15
updated: 2026-11-15
generated-with: Claude Code (Claude Opus 5.5)
template: specification
---

# Specification

What the tool does and under which constraints it is built.

## Requirements

- A research tool that carries catalogue data into a modelled schema, in two views on one dataset: Normalise (the rules' proposals, the uncertain first, with the evidence beside them) and Explore (the modelled clippings by periodical and year). Deciding in Normalise (confirm, reject, change, by a named person) is planned in [plan.md](plan.md), not built.
- The output is the product: `docs/data/export/` holds the modelled clippings and a register of periodicals as CSV and JSON with licence, written by `scripts/export.py` and offered under Data.
- Every number on the page is computed by code: entity, status and export counts in `tests/test_model.py`, side panel counts and rule invariants (supplements, alias scope, written forms and dates found in the catalogue line) in `tests/test_rules.py`.
- Clippings not read as a periodical (not parsed, book reference, no publication line) are counted and shown, never dropped; lines not parsed are told apart by cause.
- Possible same periodicals that no rule joins are proposed as questions by stated, tested criteria (`scripts/candidates.py`, `tests/test_candidates.py`); nothing is joined by them, and the export carries them as `candidates-same-periodical`.
- Explore answers place and time questions in the page: rows group by periodical or by city, a city filters both views, a strip shows the clippings per year.
- A clipping's detail shows its catalogue line, the reading by rule, the rules applied, the signature, a facsimile with a deep-zoom viewer fed by the archive's IIIF service, and the link to the object in GAMS. A periodical's detail shows every catalogue form joined, the rule or reason, and the facsimiles of its clippings.
- Static HTML, CSS and JavaScript with prebuilt JSON, no build step, no runtime CDN, no client key; OpenSeadragon vendored. Explore fits one screen at 1280 x 720, 1024 x 768 and 1620 x 920; the page works at 360 px and at 200 per cent zoom; every action is reachable by keyboard (`tests/ui/keyboard.cjs`).
- English interface copy.

## Epics and user stories

The stories for the work after the talk are in [plan.md](plan.md). For the state built: an archivist sees which catalogue lines the rules propose to treat as one periodical and why, with the cases a text cannot decide first; a historian sees in which periodicals of which places the clippings appeared and when, and downloads the modelled data.

## Range of functions

- View switch Normalise and Explore; side panel filter by place or kind of case with reset.
- Normalise: grouped proposal rows with differing catalogue forms and facsimile previews.
- Explore: timeline per periodical with remainder row; keyboard navigation with announcements.
- Detail panel for a periodical, a clipping, the remainder and the clippings without a place; deep-zoom viewer.
- Data menu with four downloads; About.

## Decisions

- Shown rows in Explore: the twelve largest periodicals or places under the active filter; the rest in one remainder row.
- A supplement written into the place ("München (Beilage)") is kept as a periodical of its own; place aliases can be limited to the titles their reason names ("Frankfurt" only for the Frankfurter Zeitung).
- A clipping counts under "spelling folded" only if its own catalogue line was changed by the folding rule; a missing place counts as "place inferred", not as a folded spelling.
