---
title: Journal of Zweig Press Clippings
project: {name: szd-presse, repository: local, not yet published}
method: {name: Promptotyping, url: https://dhcraft.org/Promptotyping/}
status: active
language: en
created: 2026-11-15
updated: 2026-11-15
generated-with: Claude Code (Claude Opus 5.5)
template: journal
---

# Journal

## Open

- Publication waits for the operator's word: creating a public GitHub repository, setting the remote and switching on Pages (folder `docs/` on `main`). Until then the footer has no source-code link; add it when the repository exists.
- Licence conflict to confirm: the TEI catalogue says CC BY-NC 4.0, the stefanzweig.digital imprint says all content CC BY 4.0. The site follows each statement for its own material (catalogue-derived data BY-NC, facsimiles BY). The facsimiles reproduce printed texts of third parties, whose rights the archive's statement may not cover.
- No parsed field and no join has been checked against the facsimiles. Status of all of them: proposal (agent, 2026-11-15).
- The rebuilt frame has not been seen by the operator. The columns variant from the GOSSIP role field is off the table for the talk and may return as its own idea.
- Plan for the mask and the decisions is in plan.md; nothing of it is built.
- Model mode was not measured by the density check, which reads the entry state only.

## Entries

### 2026-11-15 Three independent reviews, stage 1 corrections

- Trigger: three read-only reviews started by the Research Coordination (interface and text; CSS, design system and code; data against the facsimiles with an evaluation design), checked and passed on by the coordination as stage 1.
- Found, data: the place alias "München (Beilage)" joined a supplement into the Allgemeine Zeitung against the rule stated in data.md; the place alias "Frankfurt" applied to every periodical while its reason names only the Frankfurter Zeitung; "forms joined 178" counted every clipping of any periodical with a variant, including a missing place; the side panel counts were untested.
- Found, interface: remainder lanes on the time axis read as dated; not every decade labelled; arrow down skipped ten marks instead of moving a row; the alias had different signs in list and panel; accent on icons that trigger nothing; place unknown as text below 4.5:1 (measured 3.61:1); focus after closing the panel could land in the hidden view; the timeline was silent for screen readers; rows used aria-pressed for opening a detail; popovers had no fallback; chips repeated the modelled form; fifteen unparsed lines stood in one row.
- Found, CSS: dead rules, duplicate declarations, three class families per city colour.
- Observation of the data review, an inference of an agentic review and not checked here: the catalogue lines appear to be transcribed from the handwritten notes and the slips of the clipping agencies on the clippings, so a check against the facsimile tests the transcription and not the note.
- Changed: supplement rule in scripts/model.py, scoped place aliases in data/aliases.json, cases and counts per clipping, tests/test_rules.py (the supplement test fails on the committed state before the change, naming the Allgemeine Zeitung; the alias scope test failed before the scope was added); app.js rewritten for the review points; style.css cleaned with one city class; tests/ui/keyboard.cjs and tests/ui/viewer.cjs in the repository.
- Evidence: 22 tests; keyboard script 19 of 19 and viewer script 6 of 6; density as in design.md, with Explore at 1280 over the limit (open with the operator); screenshots compared with the baseline taken before the CSS changes.
- Not done (stage 2 or later, waiting for the operator): queue contents, evidence per decision, Explore overviews, row structure for throughput, moving shared rules to brand-assets, thumbnails in a second size, rules and groupings as data.

### 2026-11-15 Deep-zoom viewer from the archive's IIIF service

- Trigger: the operator asked for IIIF and an IIIF-capable OpenSeadragon so that an expert can read the clipping while deciding.
- Found: GAMS does serve IIIF (Image API 2 level 2 and a manifest per object, CORS open); the Phase 1 report "no IIIF found" was incomplete because that path had not been tried. The info.json lacks tiles and has an empty sizes list, which made OpenSeadragon fail.
- Decided: viewer over the stage with the panel (catalogue line, parsed fields, status) beside it; pages from the manifest; local reduced image as placeholder and fallback; OpenSeadragon 6.0.2 copied from szd-digital-edition, loaded only on first open; hotlinking recorded as a deliberate choice in data.md.
- Evidence: Playwright: IIIF pages load (Frankfurter Zeitung, 25 March 1911, seven pages), paging, zoom, Escape returns focus, page does not scroll, no page errors; with GAMS blocked the local image and a note appear.

### 2026-11-15 Case names in the side panel, facsimile previews in the list

- Trigger: the operator's answer „ja, Namen ins Panel und Faksimile-Vorschau in die Liste“, and the Research Coordination's decision to split the decision group.
- Changed: case kinds with visible names in the side panel; up to five facsimile previews per proposal row, then the count of the rest, as images inside the row's button (one control per row; a click on a preview opens that clipping); "Needs a decision" split into "The text cannot decide" (split title, lines not parsed) and "Place inferred or alias applied".
- Evidence: 17 tests; keyboard script 18 of 18; density passes except Explore at 1280 (76 text elements against 70), which is exceeded; whether that is accepted is open with the operator (design.md).

### 2026-11-15 Frame rebuilt after the operator's rejection

- Trigger: the operator rejected the Model state on his screen ("wieder die gleichen User-Interface-Probleme"); the Research Coordination's analysis named unused space, four levels before the data, colour without meaning in Model, a timeline that played no part in joining, small type, hidden affordances and explanatory text.
- Decided: one header row; rail as legend and filter; closing panel; Normalise as a list of proposals grouped by what needs an expert first (stated criterion: split title, inferred place, editorial alias, line not parsed); Explore fitted to the viewport; no explanatory paragraph on the page.
- Rejected: a sparkline per row (time; legibility first).
- Found: the first rebuild failed the density check in both views and both widths (boxed rows, two-node chips, rail before the stage in reading order); rows lost their boxes, chips became one node, case kinds became icons with tooltips in the rail, the loose lanes lost their duplicate counts, the rail moved after the stage in the DOM.
- Evidence: density passes in Normalise and Explore at 1280 and 360; keyboard script 18 of 18; 200 per cent zoom without horizontal scroll in both views; 17 tests.

### 2026-11-15 Reframed as a modelling tool with two parts and an output

- Trigger: the operator's sharpening, relayed by the Research Coordination: a tool to carry the data into the modelled schema, with an input view and an analysis view.
- Decided: switch renamed Model and Explore; heading names the activity; export of modelled clippings and a periodical register (CSV, JSON, licence CC BY-NC 4.0) under a Data menu; status shown in every mark, with the confirmed form in the key and "none yet"; phone labels wrap to three lines.
- Found by a fresh reader with one task per part (both solved): hollow not-read marks and the selection ring could be read as "confirmed"; "parser" left open whether a rule or a model; the facsimile pushed the parsed date out of the panel. Not-read marks are now dashed, selection uses the accent, the label reads "Read by rule as", the image is smaller.
- Changed: scripts/export.py, tests/test_model.py, docs/, knowledge/plan.md (plan for after the talk).
- Evidence: 17 tests, including one that the export matches the page counts; density check passes at 1280 and 360; keyboard script passes all steps; four downloads answer 200 on the local server.

### 2026-11-15 Second reading, keyboard path, 200 per cent zoom

- Trigger: request of the Research Coordination before the operator's review.
- Found: focus stayed in the figure after opening a clipping, so the panel was reachable only past every row; both switch buttons were tab stops; the three not-read groups overlapped and sat under the year axis, read as years; a second fresh reader found "spelling", "modelled", "Model" and "unread" unclear and the catalogue grey confusable with "unknown".
- Changed: keyboard opening moves focus to the panel and Escape returns it; switch has one tab stop; not-read groups as three labelled lanes; wording of switch, key, panel and groups; catalogue dots in ink.
- Evidence: Playwright keyboard script, all steps pass; 200 per cent zoom (640 x 360 CSS) without horizontal scroll; density check passes at 1280 and 360.

### 2026-11-15 Instrument built and checked

- Trigger: approval of the plan by the operator, relayed by the Research Coordination, with three additions (finished tool, family of GOSSIP and CorrespExplorer, one specialised idea).
- Decided: one figure whose switch moves the same dots from catalogue spellings to periodicals; rows of the twelve largest periodicals plus every split periodical; grey dots in catalogue mode.
- Rejected: cities as rows; side-by-side panels for before and after; a map.
- Found: parser misread a date range and publisher lines as periodicals; added book markers, a range check and the rule that a bare year without an issue stays unread.
- Corrected after a fresh reader (screenshots only): colours and signs had no key, groups below the axis read as years, "written string" and "Aufsatzablage" were opaque, the cases did not read as buttons, phone titles were cut. Added the key line, moved the axis to the top, reworded, wrapped phone labels.
- Changed: scripts/parse_published.py, scripts/model.py, data/aliases.json, docs/.
- Evidence: 16 tests in tests/ (four over the whole dataset); density check passes at 1280 and 360; no page errors in Playwright runs.

### 2026-11-15 Profile and parser

- Trigger: Phase 1 of the commission, plan before code.
- Found: 624 records, 322 publication lines; one newspaper under several spellings and place forms; one title for two papers.
- Evidence: tests/test_parse_published.py.
