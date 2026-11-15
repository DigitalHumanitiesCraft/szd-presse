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

How the tool looks and behaves, and why. State of 2026-11-15 after the review corrections (stage 1).

## Design stance

A research tool with two views on one dataset: Normalise, where an expert sees the rules' proposals for joining catalogue lines into periodicals, the uncertain first, with the evidence beside them; and Explore, the modelled clippings by periodical and year. The figure takes the space; everything around it stays restrained.

## Design system

- Shared DHCraft header and footer from `brand-assets/web` at commit `b0641cc`, copied unchanged into `docs/assets/dhcraft/`. Header and footer markup follow CorrespExplorer's `index.html`; the GOSSIP role field gave the inline SVG symbol sprite and the icon-with-accessible-name pattern.
- Light ground fixed with `data-theme="light"`.
- Colour carries one meaning in both views: place of publication (Wien, Berlin, other places, place unknown), set per element by one class (`city-...`) that defines `--city` for marks and swatches and `--city-text` for text. Text colours reach 4.5:1 or more on the page and surface grounds; place unknown has its own darker text token (measured 5.25:1 on the page ground).
- Accent purple only on what can be clicked or is selected; icons in the detail panel that trigger nothing are in the soft ink.
- Catalogue lines in the monospace, since they are strings a reader compares literally.

## Frame

One header row: brand, status pill, a small segmented switch Normalise and Explore with tooltips, Data, About; no page heading. Side panel on the left: places, each placed clipping once, with a note on the clippings not placed; kinds of case, overlapping, each with sign, name and count; a reset when a filter is active; one quiet status line ("Every join is a proposal by rule; none is confirmed yet"). The stage takes the remaining width; the detail panel appears only while something is selected and closes with its button or Escape. The deep-zoom viewer covers the stage while the detail panel stays beside it. The footer stays below the tool and is reached by scrolling the page.

## Interaction patterns

- Switch as a radio group with one tab stop; arrow keys switch. The address `#explore` opens Explore.
- Side panel entries filter both views (`aria-pressed`); in Explore the entries for clippings without a place also open them in the detail panel, since they have no position on the time axis.
- Rows that open a detail use `aria-expanded` and `aria-controls="panel"` with a short accessible name. Escape closes the viewer first, then the panel; focus returns to the row or control that opened it, found again in the view that is shown.
- On the focused timeline, left and right move along a row, up and down to the neighbouring row, Enter opens the clipping; the live region announces catalogue line, periodical, place and date.
- Facsimile previews in Normalise rows are images inside the row's button; a click opens that clipping, the keyboard reaches the same pages through the row's detail panel.
- Popovers (Data, About) fall back to toggled elements where the popover attribute is not supported.

## Visualisation logic

- Explore: one mark per placed clipping. Rows are chosen by count under the active filter, the twelve largest first, the rest in a shaded row labelled "Remainder"; a split title carries its sign on its row and gets no guaranteed row. A button "Group by city" turns the rows into places ranked by count; a place row filters both views to that place, and its periodicals get their own rows. A strip above the rows shows exact bars per year for the clippings under the filter. Marks that fall into the same slot are stacked, centred on the row, and each row is as tall as its highest stack needs, so no mark lies on another; the mark size shrinks until all rows fit the stage. Every decade labelled. Clippings without a place are not drawn on the time axis.
- Normalise groups, all listed, none behind an expander: "One title, two places" (split titles), "Possible same periodical, not joined" (candidates from stated criteria in scripts/candidates.py: a supplement beside its paper, a title within a combined title, an unparsed line that begins with a known title, near-identical titles; each row shows both sides, the criterion as its sign with its name, and facsimile previews), "Not parsed: title known, date or issue unread", "Not parsed: no periodical named", "Place inferred, alias or supplement", "Joined by rule", "Set aside by rule", "Unchanged, one form each". Only the catalogue forms that differ from the modelled periodical appear as chips.
- One sign per kind of case everywhere: spelling folded (arrow), editorial alias (pen), title split (fork), place inferred (pin), supplement (pages), not parsed, book reference, no publication line.
- Counts: places are disjoint and sum to the placed clippings; kinds of case overlap. Both come from `data.counts`, written and tested by `scripts/model.py` and `tests/test_rules.py`.
- Status: every statement is a proposal by rule; this is said once, in the side panel. No mark or key shows a confirmed state, since nobody has reached it.

## Measurements

After stage 2 and the fresh reader (2026-11-15): Normalise passes at 1280 (58) and 360 (17); Explore passes at 360 (20) and measures 78 text elements at 1280, over the limit of 70 and within the 83 the operator accepted.

Earlier state:

`tools/check_ui_density.cjs`, profile `work`, 2026-11-15 after stage 1: Normalise passes at 1280 (64 text elements) and 360 (18); Explore passes at 360 (19) and exceeds the limit at 1280 with 83 text elements against 70. The excess comes from the visible case names (his request), the two side panel labels with the note on clippings not placed and the status line (review points 3 and 14), the alias and supplement entries (review point 7) and every decade on the axis (review point 6), less the removed remainder lanes. Accepted by the operator for this state: asked by the Research Coordination, verbatim, „Nimmst du die Überschreitung an, und soll die Session jetzt aus Stufe 2 die Liste der möglichen Zusammenführungen und die Übersicht nach Stadt und Jahr bauen?“, he answered „ja ja“ (2026-11-15). The acceptance covers these 83 text elements in Explore at 1280, not further growth; anything added later is measured and reported again.

## Operator feedback

- 2026-11-15, relayed by the Research Coordination, verbatim: „Dann würden wir diesen Prototypen gleich auf die erste Folie nach der Vorstellung von mir und DHCraft als Screenshot und mit einem GitHub Pages Link zu einem fertigen Tool. Und das muss wie das GOSSIP Tool oder CorrespExplorer sein? Eben nur spezialisiert und innovativ und fertig ausgebaut“. Maps to yardstick rule 31 (family header and footer). Status: addressed in the first build, not yet seen by the operator.
- 2026-11-15, relayed by the Research Coordination, verbatim: „Man möchte nicht vor und nach dem Modellieren haben, sondern man möchte eigentlich ein Werkzeug haben, um die Daten in das modellierte Schema zu überführen. damit ich da mit den modellierten Daten arbeiten kann“ and „Das heißt, wir haben ein Tool mit zwei Ansichten: einer Dateneingabeansicht und einer Ansicht zur Analyse.“ Maps to yardstick rule 39 (views by the subject people work with). Status: reframed as Model and Explore (since 588c4f2 named Normalise and Explore) with export; the mask with decisions is planned in plan.md.
- 2026-11-15, relayed by the Research Coordination, verbatim: „Also, wir haben wieder die gleichen User-Interface-Probleme. Analysiere mal selber kritisch, was das alles ist, und erzeuge das verbesserte User Interface.“ Maps to yardstick rules 14, 22, 28, 35, 41 and to the section on surfaces in Operator-Wissen. Status: rebuilt in commit 588c4f2 and after; not yet seen by the operator.
- 2026-11-15, relayed by the Research Coordination, verbatim: „ja, Namen ins Panel und Faksimile-Vorschau in die Liste“. Rules 7, 29. His sentence suspends no limit. With the case names visible, Explore at 1280 measures 76 text elements against the limit of 70; the limit is exceeded, and whether that is accepted is an open question with him. (An earlier wording here, taken from a brief, said the limit yielded on his word; that was wrong.) Status: built, commit after 923e3e5.
- 2026-11-15, on the Explore state before the rebuild, relayed by the Research Coordination, verbatim: „Warum nutzt die Datenvisualisierung nicht die ganze Breite?“ Rule 41. Status: fixed in 588c4f2, the figure takes the stage, the panel appears only on a selection.
- 2026-11-15, same, verbatim: „Warum sind es so viele Ebenen?“ Rule 35. Status: fixed in 588c4f2, one header row before the data, measured.
- 2026-11-15, same, verbatim: „Warum ist der Button so groß?“ Rule none (size of a control is not yet a yardstick rule; finding for the yardstick). Status: switch reduced to a small segmented control in the header row, commit after f528e76.
- 2026-11-15, same, verbatim: „Warum können Titel, Button und Legende, also zumindest Button und Legende, zusammengeführt werden?“ (read by the Research Coordination as: why are they not merged). Rule 7 (legend in the control). Status: page title removed, switch in the header row, legend joined with the filter in the side panel; switch and legend are not one control.
- 2026-11-15, same, verbatim: „Warum kann es nicht ein Side-Panel geben?“ Rules 28, 29. Status: fixed in 588c4f2, the left side panel is legend and filter with icons, tooltips and counts.
