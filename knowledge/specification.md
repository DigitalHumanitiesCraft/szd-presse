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

- One view, one figure, no navigation and no tutorial. The before and after of modelling is one figure with a switch: Catalogue (one row per written string) and Model (one row per periodical). The dots move between the two states.
- Every number on the page is computed from the data by code; `tests/test_model.py` fails when parser or joins change the counts.
- Unparsed, book and missing references are counted and shown as their own group.
- A click on a dot shows the facsimile, the signature, the original catalogue line next to the modelled fields, the decisions taken on it and the status "machine-parsed, not verified". A click on a row shows every written title and place form the join merged, with the rule or reason.
- Static HTML, CSS and JavaScript with prebuilt JSON, no build step, no runtime CDN, no client key. One screen at 1280 x 720 and at 1024 x 768 without scrolling for the figure; works at 360 px; keyboard reachable.
- English interface copy.

## Epics and user stories

Historians who plan an edition of periodicals and organisational records across countries see in a minute what becomes of a catalogue once the periodical is an object with place and time instead of a line of text, and which decisions that step takes.

## Range of functions

- Mode switch Catalogue and Model, animated unless reduced motion is requested.
- Two prepared cases in the side panel: Frankfurter Zeitung (four place forms, one newspaper) and Der Morgen (one title, two periodicals).
- Row panel, item panel with facsimile, remainder list of all further periodicals, not-read list.
- Arrow keys move over the dots, Enter opens, Escape returns to the overview.

## Decisions

- Shown rows: the twelve largest periodicals plus every periodical produced by a split, so the case "one title, two papers" is always visible; the rest in one row.
- In Catalogue mode the dots are grey, since the catalogue does not know the city; colour by city (Wien, Berlin, other places) appears with the model.
- Alternative considered and not taken: cities as rows. It reads more geographically but hides that the periodical as an object is what carries the grouping.
