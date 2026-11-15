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
- Not seen by the operator on screen yet. A columns variant built from the GOSSIP role field is under consideration; if decided, it is built beside this state, never in place of it.
- Model mode was not measured by the density check, which reads the entry state only.

## Entries

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
