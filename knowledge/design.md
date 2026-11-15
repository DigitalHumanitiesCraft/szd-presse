---
title: Design of Zweig Press Clippings
project: {name: szd-presse, repository: local, not yet published}
method: {name: Promptotyping, url: https://dhcraft.org/Promptotyping/}
status: draft
language: en
created: 2026-11-15
updated: 2026-11-15
generated-with: Claude Code (Claude Opus 5.5)
template: design
---

# Design

How the one instrument looks and behaves, and why.

## Design stance

A specialised instrument for one question, made to be read from the back of a room in a minute. The modelling step is the interaction: one switch moves the same dots from catalogue spellings to periodicals.

## Design system

- Shared DHCraft header and footer from `brand-assets/web` at commit `b0641cc`, copied unchanged into `docs/assets/dhcraft/` (tokens, components, mark, fonts, licence). Header and footer markup follow CorrespExplorer's `index.html` (brand, status pill, dark footer with icon links, licence line); the role field of GOSSIP gave the inline SVG symbol sprite and the icon-with-accessible-name pattern.
- Light ground fixed with `data-theme="light"`.
- Colour carries one meaning: city of publication, Wien, Berlin, other places, unknown. Catalogue mode is grey because the catalogue does not know the city. Accent purple marks only what can be clicked or is selected.
- Catalogue spellings are set in the monospace, since they are strings a reader compares literally.

## Interaction patterns

- Switch Catalogue and Periodicals as a radio group; arrow keys switch.
- Row labels are buttons over the SVG; dots are reached with arrow keys on the focused figure; Escape returns to the overview.
- Side panel for the current selection, two prepared cases as its empty state.

## Visualisation logic

- Unit: one dot per clipping. Composition mode: every item sits in exactly one row; rows and the not-read group add up to the total, asserted in `scripts/model.py` before writing.
- Each count stands once, at the right end of its row; the total once, in the panel's opening sentence.
- Legend in the key line beside the switch, which changes with the mode.

## Measurements of 2026-11-15

`tools/check_ui_density.cjs` (copied unchanged from `pruefansicht`), profile `work`, entry view: wide passes at the limits for text styles and text elements; narrow passes.

## Operator feedback

- 2026-11-15, relayed by the Research Coordination, verbatim: „Dann würden wir diesen Prototypen gleich auf die erste Folie nach der Vorstellung von mir und DHCraft als Screenshot und mit einem GitHub Pages Link zu einem fertigen Tool. Und das muss wie das GOSSIP Tool oder CorrespExplorer sein? Eben nur spezialisiert und innovativ und fertig ausgebaut“. Maps to yardstick rule 31 (family header and footer). Status: addressed in the first build, not yet seen by the operator.
