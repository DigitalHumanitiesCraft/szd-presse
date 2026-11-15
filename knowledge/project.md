---
title: Zweig Press Clippings
project: {name: szd-presse, repository: https://github.com/DigitalHumanitiesCraft/szd-presse}
method: {name: Promptotyping, url: https://dhcraft.org/Promptotyping/}
status: draft
language: en
created: 2026-11-15
updated: 2026-11-15
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
template: project
---

# Zweig Press Clippings

A research tool that carries catalogue data into a modelled schema. The press clippings of the Aufsatzablage in the Stefan Zweig estate carry their place of publication as one free-text line per catalogue record. In Normalise, stated rules propose how these lines join into periodicals with place and date, the uncertain cases and the possible same periodicals first, with the facsimile beside the proposal; in Explore, the modelled clippings are shown by periodical or by city and year. The modelled data, a register of periodicals and the open questions can be downloaded; every statement is a proposal by rule until a person confirms it.

Published on 2026-11-15 at https://dhcraft.org/szd-presse/, source at https://github.com/DigitalHumanitiesCraft/szd-presse.

## Data basis

The TEI catalogue of the Aufsatzablage from Stefan Zweig Digital (Literaturarchiv Salzburg), copied from the repository `szd-htr`, and the first facsimile page of each clipping from GAMS. Details in [data.md](data.md).

## Wider context

Built on 2026-11-15 as the opening example of an impulse talk at a workshop of the planned edition project CHANGE (Changing Gender Orders in Europe, 1945–2000), whose plan joins periodicals, organisational records and estates across eight countries. The Zweig clippings are not CHANGE's subject; they show the form of its question: in which periodicals of which places, in which years, and what a collection looks like once the periodical is an entity instead of a string.

## What it is about

Thesis of the talk the instrument serves: modelling a research data workflow is a Digital Humanities way of thinking about a project. The figure makes one modelling step visible and checkable, with every join and every refusal to guess shown.

## Technical implementation

Static page in `docs/` without build step, data prebuilt by Python scripts in `scripts/`, tests in `tests/`. See [specification.md](specification.md) and [design.md](design.md).
