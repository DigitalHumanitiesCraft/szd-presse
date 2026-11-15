---
title: Plan for the modelling tool after 16 November 2026
project: {name: szd-presse, repository: https://github.com/DigitalHumanitiesCraft/szd-presse}
method: {name: Promptotyping, url: https://dhcraft.org/Promptotyping/}
status: draft
language: en
created: 2026-11-15
updated: 2026-11-15
generated-with: Claude Code (Claude Opus 5.5)
template: plan
---

# Plan

What the tool becomes after the talk: a research tool that carries catalogue data into a modelled schema. It proposes entities, such as periodicals, from free-text statements, puts every merge up for decision, and hands out the modelled data. Two parts work on one dataset: a normalisation mask for experts (Model) and an information visualisation of the modelled data points (Explore). Nothing here is built yet; the state of 15 November is described in [specification.md](specification.md).

The basic ideas below are the Research Coordination's proposal, which the operator let stand without objecting on 15 November 2026. They are not his decisions.

## Basic ideas

- One dataset, two ways of working, the same mark for the same clipping in both, and a way from any point of the view into the mask and back.
- Decide per merge, not per record: one decision covers every clipping whose line the merge joins.
- The uncertain first: the mask orders merges by how much they need a person (splits, inferred places, editorial aliases, then rule-only folds).
- The evidence beside the decision: catalogue line, parsed fields, facsimile.
- Every statement carries producer and status: proposal, doubted, confirmed; by a rule or by a named person, with date.
- Rules are visible and changeable, with a preview of how many items would move before a change applies.
- Nothing disappears: a rejected merge, an unread line and a book reference stay in the data with their status.
- The output is the product: modelled clippings and a register of entities, with provenance per statement.
- The mask is dense, keyboard-driven and built for throughput; the view belongs to the figure.
- Collection, schema, rules and groupings are data, so a second catalogue fits without rebuilding, and the same form later serves names of organisations, the gap found in the catalogues likely to feed CHANGE.

## User stories

### The expert who normalises

An archivist or editor who knows the press of the period goes through the proposed merges, confirms, rejects or changes each, and names herself as the one who decided.

Features: merge queue ordered by uncertainty; per merge the catalogue lines it joins with counts, the rule, the parsed fields and the facsimiles of a sample; keys for confirm, reject, doubt, edit label or place, next; a free-text note per decision; a rule panel with preview counts; decisions written as statements with person and date.

Test task for a fresh subagent: "Confirm that 'Frankfurter Zeitung, Frankfurt a. M.' and 'Frankfurter Zeitung, Frankfurt' are the same newspaper, reject one other proposed merge as doubtful with a note, and say how many clippings changed status. Use only the keyboard."

### The researcher who explores

A historian who asks in which periodicals of which places, in which years, the pieces appeared, and who wants the result for her own analysis.

Features: the Explore figure with groupings by periodical, place and year; marks that show proposal, doubted or confirmed; a filter by status ("confirmed only"); from any mark a link into the mask at its merge; download of the current selection with provenance.

Test task: "Find the periodicals from Basel and Zürich, open one clipping, go to the decision behind its periodical and back, then download only the confirmed clippings of Swiss periodicals."

### The project lead

The person responsible for the edition, who wants to know how much is checked, by whom, and what is left.

Features: a progress line in the mask: statements by status and producer; the list of open merges with the clippings they affect; a log of decisions by person and date; export of the register with status counts.

Test task: "Say how many clippings rest on a confirmed periodical, how many on proposals only, who confirmed most, and which three open merges would settle the most clippings."

## Wireframe of the mask

```
+--------------------------------------------------------------------------------+
| Zweig Press Clippings     [Model] Explore                       Data  About    |
+--------------------------------------------------------------------------------+
| Open merges 31 | doubted 2 | confirmed 0      rule: fold, alias, split, infer  |
+-----------------------------+--------------------------------------------------+
| QUEUE (uncertain first)     | MERGE: Frankfurter Zeitung, Frankfurt am Main     |
|  > split   Der Morgen    2  |  Joins                         clippings          |
|  > infer   Frankfurter Z.11 |   [x] Frankfurter Zeitung, Frankfurt a. M.   6     |
|    alias   Berliner Tag. 30 |   [x] Frankfurter Zeitung, Frankfurt         3     |
|    alias   National-Ztg   5 |   [x] Frankfurter Zeitung, Frankfurt am Main 1     |
|    fold    Lit. Echo     11 |   [x] Frankfurter Zeitung (no place)         1     |
|    ...                      |  Rule: place alias "Frankfurt" -> Frankfurt a. M.  |
|                             |        reason: the paper appeared there            |
|                             |  Evidence  [facsimile] [facsimile] [facsimile]     |
|                             |   line: "Frankfurter Zeitung, 25. 3. 1911"         |
|                             |   parsed: FZ | - | 1911-03-25 | -                  |
|                             |  Authority  ZDB/GND candidates (score)  [link]     |
|                             |  [C]onfirm  [R]eject  [D]oubt  [E]dit   note: ___  |
|                             |  by: (named person)            J/K next/previous   |
+-----------------------------+--------------------------------------------------+
```

## Authority data

A reconciliation step would attach to a confirmed periodical an identifier from an authority file and turn the register into linked data. It sits in the merge panel, under the evidence and above the decision: candidates with score and description, one accepted per entity, stored as a statement with producer and status like any other.

- GND: the lobid-gnd service offers OpenRefine reconciliation (`https://lobid.org/gnd/reconcile`, read 2026-11-15 through a summarising fetch). It covers corporate bodies and works and could serve organisations later.
- ZDB, the German union catalogue of serials: the obvious authority for periodicals. No reconciliation service was found in the sources opened on 2026-11-15; the OpenRefine wiki list mentions ZDB only as a contributor to the GND. Whether ZDB identifiers are reachable through GND records or another API is open.

## Prior art: OpenRefine

Read on 2026-11-15 through summarising fetches by a read-only subagent, not word by word; the claims below reach only as far as those readings.

- Clustering ("Cluster and edit") groups variant values by key collision (fingerprint, n-gram fingerprint, phonetic keys including Cologne phonetics) or nearest neighbour (Levenshtein, PPM). The expert decides per cluster, choosing or typing the new value; only approved merges change the data, and a merge can be followed by re-clustering. Operations are kept as undo and redo history, extractable as JSON.
- Reconciliation matches cells against a service following the W3C reconciliation API (candidates with id, name, score and an optional match flag). A judgment is stored per cell as matched, new or none, with the scope of the action (this cell, or all cells with the same value) and a timestamp; the cell keeps its original string.
- What the sources do not show, and what is therefore new here (inference): a named person per decision; a doubted status distinct from a rule's proposal and a confirmation; ordering by uncertainty; evidence such as facsimiles beside the decision; a count of affected items before a rule changes; a register of entities as output in its own right; a linked visualisation of the modelled data. A cluster merge in OpenRefine overwrites the cell value, which the rule "nothing disappears" would not allow.

Sources, accessed 2026-11-15: OpenRefine documentation, "Clustering methods in-depth" (https://openrefine.org/docs/technical-reference/clustering-in-depth), manual pages "Cell editing", "Reconciling", "Expressions" and "Running" (history) at https://openrefine.org/docs/manual/; W3C Entity Reconciliation Community Group, Reconciliation Service API v0.2 (https://www.w3.org/community/reports/reconciliation/CG-FINAL-specs-0.2-20230410/); lobid, GND Reconcile (https://lobid.org/gnd/reconcile); OpenRefine wiki, Reconcilable Data Sources.

## Order of work

1. Statements as data: one statement per decision with producer, status, date; the current proposals become statements by rule.
2. The mask with queue, merge panel, evidence and keyboard decisions; decisions persist in a file the researchers keep, not in the browser alone.
3. Status in Explore and the filter by status; the way from a mark into the mask and back.
4. Rule panel with preview.
5. Reconciliation against GND, and ZDB if a route exists.
6. A second catalogue and organisation names, through collection, schema and rules as data.
