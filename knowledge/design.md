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

## Frame of 2026-11-15, after the operator's rejection

One header row (brand, status pill, switch Normalise and Explore with tooltips, Data, About), no page heading. Rail on the left, legend and filter at once: places with names and counts, kinds of case as icons with counts and tooltips. Stage at full width; the detail panel appears only while something is selected. Normalise rows are separated by hairlines, without boxes; the catalogue forms stand in the monospace with their counts. Explore sizes rows, marks and labels from the stage, so all rows and the three remainder lanes fit at 1280 x 720, 1024 x 768 and 1620 x 920. The footer stays below the tool and is reached by scrolling the page; the tool itself does not scroll.

Density check, profile `work`, measured in both views: Normalise wide 67 text elements, narrow 34; Explore wide 70, narrow 18; all within limits.

## Status in the marks

Filled mark: proposal by rule. Ringed mark (filled with an outer ring): confirmed by a person; none exist yet, the key says so. Dashed outline: not placed (book reference, line not parsed, no publication line). Selection: accent ring. The three must never share a form.

## Operator feedback

- 2026-11-15, relayed by the Research Coordination, verbatim: „Dann würden wir diesen Prototypen gleich auf die erste Folie nach der Vorstellung von mir und DHCraft als Screenshot und mit einem GitHub Pages Link zu einem fertigen Tool. Und das muss wie das GOSSIP Tool oder CorrespExplorer sein? Eben nur spezialisiert und innovativ und fertig ausgebaut“. Maps to yardstick rule 31 (family header and footer). Status: addressed in the first build, not yet seen by the operator.
- 2026-11-15, relayed by the Research Coordination, verbatim: „Man möchte nicht vor und nach dem Modellieren haben, sondern man möchte eigentlich ein Werkzeug haben, um die Daten in das modellierte Schema zu überführen. damit ich da mit den modellierten Daten arbeiten kann“ and „Das heißt, wir haben ein Tool mit zwei Ansichten: einer Dateneingabeansicht und einer Ansicht zur Analyse.“ Maps to yardstick rule 39 (views by the subject people work with). Status: reframed as Model and Explore with export in this build; the mask with decisions is planned in plan.md.
- 2026-11-15, relayed by the Research Coordination, verbatim: „Also, wir haben wieder die gleichen User-Interface-Probleme. Analysiere mal selber kritisch, was das alles ist, und erzeuge das verbesserte User Interface.“ Maps to yardstick rules 14, 22, 28, 35, 41 and to the section on surfaces in Operator-Wissen. Status: rebuilt in commit 588c4f2 and after; not yet seen by the operator.
- 2026-11-15, relayed by the Research Coordination, verbatim: „ja, Namen ins Panel und Faksimile-Vorschau in die Liste“. Rules 7, 29. His sentence suspends no limit. With the case names visible, Explore at 1280 measures 76 text elements against the limit of 70; the limit is exceeded, and whether that is accepted is an open question with him. (An earlier wording here, taken from a brief, said the limit yielded on his word; that was wrong.) Status: built, commit after 923e3e5.
- 2026-11-15, on the Explore state before the rebuild, relayed by the Research Coordination, verbatim: „Warum nutzt die Datenvisualisierung nicht die ganze Breite?“ Rule 41. Status: fixed in 588c4f2, the figure takes the stage, the panel appears only on a selection.
- 2026-11-15, same, verbatim: „Warum sind es so viele Ebenen?“ Rule 35. Status: fixed in 588c4f2, one header row before the data, measured.
- 2026-11-15, same, verbatim: „Warum ist der Button so groß?“ Rule none (size of a control is not yet a yardstick rule; finding for the yardstick). Status: switch reduced to a small segmented control in the header row, commit after f528e76.
- 2026-11-15, same, verbatim: „Warum können Titel, Button und Legende, also zumindest Button und Legende, zusammengeführt werden?“ (read by the Research Coordination as: why are they not merged). Rule 7 (legend in the control). Status: page title removed, switch in the header row, legend joined with the filter in the side panel; switch and legend are not one control.
- 2026-11-15, same, verbatim: „Warum kann es nicht ein Side-Panel geben?“ Rules 28, 29. Status: fixed in 588c4f2, the left side panel is legend and filter with icons, tooltips and counts.
