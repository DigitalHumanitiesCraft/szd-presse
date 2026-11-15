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

What the instrument does and under which constraints it was built.

## Requirements

- A research tool that carries catalogue data into a modelled schema, in two parts on one dataset and one figure: Model (rows are the catalogue lines with the rules' proposals, the place where joins are decided) and Explore (rows are the modelled periodicals by year). The same marks move between the two parts. Deciding in the mask (confirm, reject, change, by a named person) is planned in [plan.md](plan.md), not built.
- The output is the product: `docs/data/export/` holds the modelled clippings and a register of periodicals as CSV and JSON, with licence, written by `scripts/export.py`; the Data menu offers them.
- Every mark shows its status. Today every statement is a proposal by rule; the key carries the confirmed state (ringed mark) with "none yet".
- Every number on the page is computed from the data by code; `tests/test_model.py` fails when parser or joins change the counts.
- Unparsed, book and missing references are counted and shown as their own group.
- A click on a dot shows the facsimile, the signature, the original catalogue line next to the modelled fields, the rules applied to it and the status "proposal by rule, not confirmed". A click on a row shows every written title and place form the join merged, with the rule or reason.
- Static HTML, CSS and JavaScript with prebuilt JSON, no build step, no runtime CDN, no client key. One screen at 1280 x 720 and at 1024 x 768 without scrolling for the figure; works at 360 px; keyboard reachable.
- English interface copy.

## Epics and user stories

Historians who plan an edition of periodicals and organisational records across countries see in a minute what becomes of a catalogue once the periodical is an object with place and time instead of a line of text, and which decisions that step takes.

## Range of functions

- Part switch Model and Explore, animated unless reduced motion is requested.
- Data menu with the four downloads and their licence.
- Two prepared cases in the side panel: Frankfurter Zeitung (four place forms, one newspaper) and Der Morgen (one title, two periodicals).
- Row panel, item panel with facsimile, remainder list of all further periodicals, not-read list.
- Arrow keys move over the dots, Enter opens, Escape returns to the overview.

## Decisions

- Shown rows: the twelve largest periodicals plus every periodical produced by a split, so the case "one title, two papers" is always visible; the rest in one row.
- In Model the marks carry no city colour, since the catalogue line does not yet give a place to group by; colour by city (Wien, Berlin, other places) appears in Explore.
- Alternative considered and not taken: cities as rows. It reads more geographically but hides that the periodical as an object is what carries the grouping.
