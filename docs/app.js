// Zweig Press Clippings: two views on one dataset. Normalise lists the rules' proposals for joining
// catalogue lines into periodicals, the uncertain first; Explore shows the modelled clippings by
// periodical and year. The rail is legend and filter for both. Data are prebuilt by scripts/model.py.
"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
const YEAR_MIN = 1900;
const YEAR_MAX = 1942;
const TOP_ENTITIES = 12;
const GAMS = "https://gams.uni-graz.at/";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const PLACES = [
  { key: "Wien", label: "Wien" },
  { key: "Berlin", label: "Berlin" },
  { key: "other", label: "other places" },
  { key: "unknown", label: "place unknown" },
];
// Kinds of case. Each is a property of a clipping, so a clipping can carry several; the rail
// counts clippings per kind (inclusive), the place entries above count each clipping once.
const CASES = [
  { key: "joined", icon: "merge", label: "forms joined", tip: "the periodical was written in more than one way in the catalogue" },
  { key: "split", icon: "split", label: "title split", tip: "one title written with two places, taken as two periodicals" },
  { key: "infer", icon: "infer", label: "place inferred", tip: "no place written; taken from the other lines of the same periodical" },
  { key: "unread", icon: "unread", label: "not parsed", tip: "the parser leaves the line as it is rather than guess" },
  { key: "book", icon: "book", label: "book reference", tip: "the line names a book, not a periodical" },
  { key: "none", icon: "none", label: "no publication line", tip: "the record names no publication" },
];

const $ = (sel) => document.querySelector(sel);
const state = { view: "normalise", filter: null, selected: null, focusIndex: -1, showUnchanged: false };
let data;
let dotEls = new Map();
let layout;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function icon(id, label) {
  const name = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
  return `<svg class="dh-icon"${name}><use href="#i-${id}"/></svg>`;
}

function written(it) {
  return it.placeWritten ? `${it.written}, ${it.placeWritten}` : it.written;
}

function dateText(d) {
  if (!d) return "";
  if (d.day) return `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
  if (d.month) return `${MONTHS[d.month - 1]} ${d.year}`;
  return String(d.year);
}

function xKey(it) {
  return it.date ? it.date.year * 400 + (it.date.month ?? 0) * 32 + (it.date.day ?? 0) : 0;
}

// Derived properties per clipping: its city group and the kinds of case it carries.
function derive() {
  data.entityById = new Map(data.entities.map((e) => [e.id, e]));
  for (const it of data.items) {
    const e = it.entity && data.entityById.get(it.entity);
    it.city = e ? e.city : null;
    const kinds = new Set();
    if (it.status !== "periodical") kinds.add(it.status);
    if (e && (Object.keys(e.titleForms).length > 1 || Object.keys(e.placeForms).length > 1)) kinds.add("joined");
    for (const d of it.decisions) if (d.kind === "split" || d.kind === "infer") kinds.add(d.kind);
    it.kinds = kinds;
  }
  for (const e of data.entities) {
    e.items = data.items.filter((it) => it.entity === e.id);
    const forms = new Map();
    for (const it of e.items) forms.set(written(it), (forms.get(written(it)) ?? 0) + 1);
    e.forms = [...forms.entries()].sort((a, b) => b[1] - a[1]);
    // Stated criterion for "needs a decision": a split title, an inferred place or an editorial alias.
    e.needs = e.items.some((it) => it.decisions.some((d) => d.kind === "split" || d.kind === "infer" || d.kind === "alias"));
  }
}

function matches(it) {
  const f = state.filter;
  if (!f) return true;
  return f.type === "place" ? it.city === f.key : it.kinds.has(f.key);
}

// Rail: legend and filter at once, with clipping counts.
function renderRail() {
  const placeCount = (k) => data.items.filter((it) => it.city === k).length;
  const caseCount = (k) => data.items.filter((it) => it.kinds.has(k)).length;
  const btn = (type, key, inner, tip, n, name) => {
    const on = state.filter?.type === type && state.filter.key === key;
    return `<button type="button" class="rail-item${on ? " on" : ""}" aria-pressed="${on}" data-type="${type}" data-key="${key}" aria-label="${esc(name)}, ${n} clippings" aria-describedby="rt-${key}">${inner}<span class="n">${n}</span><span class="tipbox" role="tooltip" id="rt-${key}">${esc(tip)}</span></button>`;
  };
  $("#rail").innerHTML = `
    <div class="rail-group" role="group" aria-label="Place of publication">${PLACES.map((p) =>
      btn("place", p.key, `<span class="sw c-${p.key}" aria-hidden="true"></span><span class="rl">${esc(p.label)}</span>`, `clippings in periodicals of ${p.label}`, placeCount(p.key), p.label)).join("")}</div>
    <div class="rail-group cases" role="group" aria-label="Kind of case">${CASES.map((c) =>
      btn("case", c.key, `${icon(c.icon)}<span class="vh">${esc(c.label)}</span>`, `${c.label}: ${c.tip}`, caseCount(c.key), c.label)).join("")}</div>
    ${state.filter ? '<button type="button" class="rail-reset" id="reset">Show all</button>' : ""}`;
  $("#rail").querySelectorAll(".rail-item").forEach((b) => b.addEventListener("click", () => {
    const same = state.filter?.type === b.dataset.type && state.filter.key === b.dataset.key;
    state.filter = same ? null : { type: b.dataset.type, key: b.dataset.key };
    refresh();
    $(`#rail [data-key="${b.dataset.key}"]`)?.focus();
  }));
  $("#reset")?.addEventListener("click", () => { state.filter = null; refresh(); $("#rail .rail-item").focus(); });
}

// Normalise: one row per proposal, grouped by what needs an expert first.
function renderNormalise() {
  const ents = data.entities.filter((e) => e.items.some(matches));
  // Within "needs a decision": a split title first, then an inferred place, then an editorial alias.
  const weight = (e) => (e.split ? 0 : e.items.some((it) => it.kinds.has("infer")) ? 1 : 2);
  const needs = ents.filter((e) => e.needs).sort((a, b) => weight(a) - weight(b) || b.count - a.count);
  const joined = ents.filter((e) => !e.needs && e.forms.length > 1).sort((a, b) => b.count - a.count);
  const unchanged = ents.filter((e) => !e.needs && e.forms.length === 1).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"));
  const loose = ["unread", "book", "none"].map((k) => ({ kind: k, items: data.items.filter((it) => it.status === k && matches(it)) })).filter((g) => g.items.length);

  const sel = state.selected;
  const entRow = (e) => {
    const on = sel?.type === "entity" && sel.id === e.id;
    const marks = [e.split && icon("split", "title split"), e.items.some((it) => it.kinds.has("infer")) && icon("infer", "place inferred")].filter(Boolean).join("");
    return `<li><button type="button" class="prop${on ? " on" : ""}" aria-pressed="${on}" data-entity="${esc(e.id)}">
      <span class="prop-head"><span class="sw c-${e.city}" aria-hidden="true"></span><span class="prop-name">${esc(e.label)}</span> <span class="prop-place c-text-${e.city}">${esc(e.place ?? "place unknown")}</span>${marks ? `<span class="prop-icons">${marks}</span>` : ""}<span class="prop-n">${e.count}</span></span>
      <span class="chips">${e.forms.map(([f, n]) => `<code class="chip">${esc(f)}  ${n}</code>`).join("")}</span>
    </button></li>`;
  };
  const looseRow = (g) => {
    const c = CASES.find((x) => x.key === g.kind);
    const on = sel?.type === "loose" && sel.id === g.kind;
    return `<li><button type="button" class="prop${on ? " on" : ""}" aria-pressed="${on}" data-loose="${g.kind}">
      <span class="prop-head">${icon(c.icon)}<span class="prop-name">${esc(c.label)}</span><span class="prop-n">${g.items.length}</span></span>
      <span class="chips">${g.items.map((it) => `<code class="chip">${esc(it.raw || it.title)}</code>`).join("")}</span>
    </button></li>`;
  };
  const group = (title, rows) => rows.length ? `<section class="pgroup"><h2>${esc(title)}</h2><ul class="props">${rows.join("")}</ul></section>` : "";
  const needLoose = loose.filter((g) => g.kind === "unread");
  const setAside = loose.filter((g) => g.kind !== "unread");
  $("#normalise").innerHTML =
    group("Needs a decision", [...needs.map(entRow), ...needLoose.map(looseRow)]) +
    group("Joined by rule", joined.map(entRow)) +
    group("Set aside by rule", setAside.map(looseRow)) +
    (unchanged.length ? `<section class="pgroup"><h2><button type="button" class="opener" aria-expanded="${state.showUnchanged}" id="toggle-unchanged">Unchanged, one form each <span class="prop-n">${unchanged.reduce((a, e) => a + e.count, 0)}</span></button></h2>${state.showUnchanged ? `<ul class="props">${unchanged.map(entRow).join("")}</ul>` : ""}</section>` : "") +
    (ents.length || loose.length ? "" : '<p class="state">No clipping matches this filter. Choose "Show all" in the rail.</p>');
  $("#normalise").querySelectorAll("[data-entity]").forEach((b) => b.addEventListener("click", () => openEntity(b.dataset.entity, b)));
  $("#normalise").querySelectorAll("[data-loose]").forEach((b) => b.addEventListener("click", () => openLoose(b.dataset.loose, b)));
  $("#toggle-unchanged")?.addEventListener("click", () => { state.showUnchanged = !state.showUnchanged; renderNormalise(); $("#toggle-unchanged").focus(); });
}

// Explore: rows of the largest periodicals plus every split periodical, the rest in one row,
// the not-placed clippings in three lanes. Sizes follow the stage so nothing scrolls.
function exploreRows() {
  const ents = data.entities;
  const shown = ents.slice(0, TOP_ENTITIES);
  for (const e of ents) if (e.split && !shown.includes(e)) shown.push(e);
  const ids = new Set(shown.map((e) => e.id));
  const rows = shown.map((e) => ({ key: e.id, kind: "entity", entity: e, w: 1 }));
  const rest = ents.filter((e) => !ids.has(e.id));
  rows.push({ key: "rest", kind: "rest", label: `${rest.length} further periodicals`, entities: rest, w: 1.7 });
  for (const k of ["unread", "book", "none"]) rows.push({ key: k, kind: "loose", status: k, w: 0.8 });
  const rowOf = (it) => (it.status !== "periodical" ? it.status : ids.has(it.entity) ? it.entity : "rest");
  return { rows, rowOf };
}

function measure() {
  const fig = $("#figure");
  const width = fig.clientWidth;
  const height = fig.clientHeight;
  const narrow = width < 600;
  // Titles keep at least about 250 px, also when the detail panel narrows the figure.
  const labelW = narrow ? width * 0.46 : Math.min(420, Math.max(250, width * 0.35));
  const countW = narrow ? 30 : 46;
  return { width, height, narrow, axisH: 28, labelW, countW, x0: labelW + 10, x1: width - countW - 8 };
}

function xOf(d, L) {
  const t = d.year + ((d.month ?? 7) - 1) / 12 + ((d.day ?? 15) - 1) / 365;
  return L.x0 + ((t - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (L.x1 - L.x0);
}

function svgEl(name, attrs, parent) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function renderExplore() {
  const fig = $("#figure");
  const narrow = fig.clientWidth < 600;
  const { rows, rowOf } = exploreRows();
  const totalW = rows.reduce((a, r) => a + r.w, 0);
  if (narrow) fig.style.blockSize = `${totalW * 56 + 28}px`; else fig.style.blockSize = "";
  const L = measure();
  const unit = (L.height - L.axisH) / totalW;
  const geo = new Map();
  let y = L.axisH;
  for (const r of rows) { geo.set(r.key, { y, h: r.w * unit }); y += r.w * unit; }
  const rad = Math.max(3, Math.min(8, unit / 4.6));
  const font = Math.max(13, Math.min(21, unit * 0.5));

  const svg = $("#chart");
  svg.setAttribute("width", L.width);
  svg.setAttribute("height", L.height);
  svg.replaceChildren();
  const grid = svgEl("g", { class: "grid" }, svg);
  const lastY = geo.get("unread").y;
  for (let yr = 1900; yr <= 1940; yr += 10) {
    const x = xOf({ year: yr, month: 1, day: 1 }, L);
    svgEl("line", { x1: x, x2: x, y1: L.axisH - 4, y2: lastY }, grid);
    if (yr % 20 === 0) svgEl("text", { x, y: 16, "text-anchor": "middle", class: "axis" }, grid).textContent = yr;
  }
  svgEl("line", { class: "rowline", x1: 0, x2: L.width, y1: geo.get("rest").y, y2: geo.get("rest").y }, grid);
  svgEl("line", { class: "rowline", x1: 0, x2: L.width, y1: lastY, y2: lastY }, grid);

  const pos = new Map();
  const bins = new Map();
  const loose = { unread: 0, book: 0, none: 0 };
  for (const it of data.items) {
    const g = geo.get(rowOf(it));
    let x;
    let yy;
    if (it.status !== "periodical") {
      // Undated: a grid of marks in the lane, wrapping when the lane is narrow.
      const n = loose[it.status]++;
      const step = rad * 2.5;
      const perLine = Math.max(1, Math.floor((L.x1 - L.x0 - 8) / step));
      const lines = Math.ceil(data.items.filter((x) => x.status === it.status).length / perLine);
      x = L.x0 + 4 + (n % perLine) * step;
      yy = g.y + g.h / 2 + (Math.floor(n / perLine) - (lines - 1) / 2) * step;
    } else {
      x = xOf(it.date, L);
      const bin = `${rowOf(it)}|${Math.round(x / (rad * 2.1))}`;
      const n = bins.get(bin) ?? 0;
      bins.set(bin, n + 1);
      const off = n === 0 ? 0 : Math.ceil(n / 2) * rad * 1.9 * (n % 2 ? -1 : 1);
      const lim = g.h / 2 - rad;
      yy = g.y + g.h / 2 + Math.max(-lim, Math.min(lim, off));
    }
    pos.set(it.pid, { x, y: yy });
  }
  const dots = svgEl("g", {}, svg);
  dotEls = new Map();
  for (const it of data.items) {
    const p = pos.get(it.pid);
    const c = svgEl("circle", { cx: p.x, cy: p.y, r: rad, class: `dot ${it.status === "periodical" ? `c-${it.city}` : "loose"}` }, dots);
    c.dataset.pid = it.pid;
    dotEls.set(it.pid, c);
  }
  layout = { L, pos, rows, rowOf };

  // Row labels are buttons over the SVG so they wrap, take focus and open the periodical.
  const box = document.createElement("div");
  box.className = "labels";
  box.style.inlineSize = `${L.width}px`;
  fig.querySelector(".labels")?.remove();
  for (const r of rows) {
    const g = geo.get(r.key);
    const b = document.createElement("button");
    b.type = "button";
    b.className = `rowlabel ${r.kind}`;
    Object.assign(b.style, { top: `${g.y}px`, blockSize: `${g.h}px`, inlineSize: `${L.labelW}px`, fontSize: `${font}px` });
    let n;
    if (r.kind === "entity") {
      const e = r.entity;
      const marks = [e.merged && icon("merge", "forms joined"), e.split && icon("split", "title split")].filter(Boolean).join("");
      b.innerHTML = `<span class="rl-name">${esc(e.label)}</span><span class="rl-place c-text-${e.city}">${esc(e.place ?? "place unknown")}</span>${marks ? `<span class="rl-icons">${marks}</span>` : ""}`;
      b.dataset.entity = e.id;
      b.addEventListener("click", () => openEntity(e.id, b));
      n = e.count;
    } else if (r.kind === "rest") {
      b.innerHTML = `<span class="rl-name">${esc(r.label)}</span>`;
      b.addEventListener("click", () => openRest(b));
      n = r.entities.reduce((a, e) => a + e.count, 0);
    } else {
      const c = CASES.find((x) => x.key === r.status);
      b.innerHTML = `${icon(c.icon)}<span class="rl-name">${esc(c.label)}</span>`;
      b.style.fontSize = `${Math.max(12, font * 0.8)}px`;
      b.addEventListener("click", () => openLoose(r.status, b));
      n = data.items.filter((it) => it.status === r.status).length;
    }
    box.appendChild(b);
    if (r.kind === "loose") continue;
    const cnt = document.createElement("span");
    cnt.className = "rowcount";
    Object.assign(cnt.style, { top: `${g.y + g.h / 2 - font * 0.6}px`, fontSize: `${Math.max(12, font * 0.8)}px` });
    cnt.textContent = n;
    cnt.setAttribute("aria-hidden", "true");
    box.appendChild(cnt);
  }
  fig.appendChild(box);
  applyMarks();
}

function applyMarks() {
  const s = state.selected;
  for (const it of data.items) {
    const c = dotEls.get(it.pid);
    if (!c) continue;
    let on = matches(it);
    if (s?.type === "entity") on = on && (it.entity === s.id || (s.also ?? []).includes(it.entity));
    if (s?.type === "loose") on = on && it.status === s.id;
    c.classList.toggle("dim", !on);
    c.classList.toggle("sel", s?.type === "item" && s.id === it.pid);
  }
  document.querySelectorAll(".rowlabel[data-entity]").forEach((b) => {
    const on = s?.type === "entity" && (b.dataset.entity === s.id || (s.also ?? []).includes(b.dataset.entity));
    b.setAttribute("aria-pressed", String(on));
  });
}

function refresh() {
  renderRail();
  if (state.view === "normalise") renderNormalise(); else renderExplore();
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".mode button").forEach((b) => {
    const on = b.dataset.view === view;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $("#normalise").hidden = view !== "normalise";
  $("#figure").hidden = view !== "explore";
  refresh();
  history.replaceState(null, "", view === "explore" ? "#explore" : location.pathname + location.search);
  $("#live").textContent = view === "explore" ? "Explore: clippings by periodical and year." : "Normalise: the rules' proposals.";
}

// Detail panel: opens on a selection and closes again, so the figure keeps the full width.
function openPanel(sel, html, trigger) {
  state.selected = sel;
  state.returnTo = trigger ?? null;
  const panel = $("#panel");
  panel.innerHTML = `<button type="button" class="back" aria-label="Close the details">${icon("close")}</button>${html}`;
  panel.hidden = false;
  panel.querySelector(".back").addEventListener("click", closePanel);
  panel.querySelectorAll("[data-entity]").forEach((b) => b.addEventListener("click", () => openEntity(b.dataset.entity, state.returnTo)));
  panel.querySelectorAll("[data-pid]").forEach((b) => b.addEventListener("click", () => openItem(b.dataset.pid, state.returnTo)));
  panel.scrollTop = 0;
  refresh();
  panel.focus();
}

function closePanel() {
  const back = state.returnTo;
  state.selected = null;
  state.returnTo = null;
  $("#panel").hidden = true;
  refresh();
  const target = back?.dataset?.entity ? document.querySelector(`[data-entity="${CSS.escape(back.dataset.entity)}"]`) : back;
  (target && target.isConnected ? target : $("#stage")).focus();
}

function openEntity(id, trigger) {
  const e = data.entityById.get(id);
  const items = [...e.items].sort((a, b) => xKey(a) - xKey(b));
  const decisions = new Map();
  for (const it of items) for (const d of it.decisions) decisions.set(d.text, d);
  const titleKeys = Object.keys(e.titleForms);
  const folded = titleKeys.length > 1 && titleKeys.some((f) => f !== e.label && ![...decisions.values()].some((d) => d.text.includes(`“${f}”`)));
  const also = e.split ? data.entities.filter((x) => x.split && x.label === e.label && x.id !== id) : [];
  openPanel({ type: "entity", id, also: [] }, `
    <h2>${esc(e.label)}<span class="place c-text-${e.city}">${esc(e.place ?? "place unknown")}</span></h2>
    <p class="k">Catalogue lines joined</p>
    <ul class="forms">${e.forms.map(([f, n]) => `<li><code>${esc(f)}</code> <span class="n">${n}</span></li>`).join("")}</ul>
    ${folded ? `<p class="decision">${icon("merge")}<span>Rule: ${esc(data.foldRule)}.</span></p>` : ""}
    ${[...decisions.values()].map((d) => `<p class="decision">${icon(d.kind === "alias" ? "merge" : d.kind)}<span>${esc(d.text)}</span></p>`).join("")}
    ${also.map((s) => `<p class="decision">${icon("split")}<span>The other periodical of this title: <button type="button" class="linkish" data-entity="${esc(s.id)}">${esc(s.label)}, ${esc(s.place)}</button></span></p>`).join("")}
    <p class="k">Clippings</p>
    <div class="years">${items.map((it) => `<button type="button" class="linkish" data-pid="${esc(it.pid)}">${esc(dateText(it.date))}</button>`).join("")}</div>
  `, trigger);
}

function openRest(trigger) {
  const rest = layout.rows.find((r) => r.kind === "rest");
  openPanel({ type: "rest" }, `<h2>${esc(rest.label)}</h2>
    <ul class="forms">${rest.entities.map((e) => `<li><button type="button" class="linkish" data-entity="${esc(e.id)}">${esc(e.label)}</button> <span class="c-text-${e.city}">${esc(e.place ?? "place unknown")}</span> <span class="n">${e.count}</span></li>`).join("")}</ul>`, trigger);
}

function openLoose(kind, trigger) {
  const c = CASES.find((x) => x.key === kind);
  const its = data.items.filter((it) => it.status === kind);
  openPanel({ type: "loose", id: kind }, `<h2>${esc(c.label)}</h2><p>${esc(c.tip)}.</p>
    <ul class="forms">${its.map((it) => `<li><button type="button" class="linkish" data-pid="${esc(it.pid)}">${esc(it.raw || it.title)}</button></li>`).join("")}</ul>`, trigger);
}

function openItem(pid, trigger) {
  const it = data.items.find((x) => x.pid === pid);
  const e = it.entity && data.entityById.get(it.entity);
  const img = it.image ? `<figure class="facs"><a href="${GAMS}${esc(pid)}"><img src="img/${esc(pid.replace(":", "_"))}.jpg" alt="First page of the clipping ${esc(it.signature)}" loading="lazy"></a><figcaption>Facsimile: Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY 4.0</figcaption></figure>` : "";
  let model;
  if (e) {
    const bits = [it.date && dateText(it.date), it.issue, it.pages && `p. ${it.pages}`].filter(Boolean).map(esc).join(", ");
    model = `<button type="button" class="linkish" data-entity="${esc(e.id)}"><strong>${esc(e.label)}</strong></button>, <span class="c-text-${e.city}">${esc(e.place ?? "place unknown")}</span>${bits ? `, ${bits}` : ""}`;
  } else {
    model = esc(CASES.find((x) => x.key === it.status).label);
  }
  openPanel({ type: "item", id: pid }, `
    <h2>${esc(it.title)}</h2>
    <div class="compare">
      <div><p class="k">Catalogue line</p>${it.raw ? `<code class="line">${esc(it.raw)}</code>` : "<em>none</em>"}</div>
      <div><p class="k">Read by rule as</p><p class="model-line">${model}</p></div>
    </div>
    ${it.decisions.map((d) => `<p class="decision">${icon(d.kind === "alias" ? "merge" : d.kind)}<span>${esc(d.text)}</span></p>`).join("")}
    <p class="k">${esc(it.signature)}, proposal by rule, not confirmed</p>
    ${img}
    <p><a class="dh-icon-link" href="${GAMS}${esc(pid)}">Facsimile in Stefan Zweig Digital ${icon("ext")}</a></p>
  `, trigger);
}

function showTip(it, p) {
  const tip = $("#tip");
  tip.innerHTML = `<code>${esc(it.raw || "no publication line")}</code>`;
  tip.hidden = false;
  const w = $("#figure").clientWidth;
  tip.style.left = `${Math.max(0, Math.min(p.x + 12, w - tip.offsetWidth - 4))}px`;
  tip.style.top = `${Math.max(0, p.y - tip.offsetHeight - 10)}px`;
}

function orderedItems() {
  const idx = new Map(layout.rows.map((r, i) => [r.key, i]));
  return data.items.filter(matches).sort((a, b) => (idx.get(layout.rowOf(a)) - idx.get(layout.rowOf(b))) || (xKey(a) - xKey(b)));
}

function wire() {
  document.querySelectorAll(".mode button").forEach((b) => {
    b.addEventListener("click", () => setView(b.dataset.view));
    b.tabIndex = b.dataset.view === state.view ? 0 : -1;
  });
  $(".mode").addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const next = state.view === "normalise" ? "explore" : "normalise";
    setView(next);
    document.querySelector(`.mode [data-view="${next}"]`).focus();
    ev.preventDefault();
  });
  const svg = $("#chart");
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("pointermove", (ev) => {
    const c = ev.target.closest?.(".dot");
    if (!c) { $("#tip").hidden = true; return; }
    const it = data.items.find((x) => x.pid === c.dataset.pid);
    showTip(it, layout.pos.get(it.pid));
  });
  svg.addEventListener("pointerleave", () => { $("#tip").hidden = true; });
  svg.addEventListener("click", (ev) => {
    const c = ev.target.closest?.(".dot");
    if (c) openItem(c.dataset.pid, svg);
  });
  svg.addEventListener("keydown", (ev) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 }[ev.key];
    const list = orderedItems();
    if (step) {
      state.focusIndex = Math.max(0, Math.min(list.length - 1, state.focusIndex < 0 ? 0 : state.focusIndex + step));
      dotEls.forEach((c) => c.classList.remove("kfocus"));
      const it = list[state.focusIndex];
      dotEls.get(it.pid).classList.add("kfocus");
      showTip(it, layout.pos.get(it.pid));
      ev.preventDefault();
    } else if ((ev.key === "Enter" || ev.key === " ") && state.focusIndex >= 0) {
      openItem(list[state.focusIndex].pid, svg);
      ev.preventDefault();
    }
  });
  svg.addEventListener("blur", () => { $("#tip").hidden = true; dotEls.forEach((c) => c.classList.remove("kfocus")); });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !$("#panel").hidden && !document.querySelector(".about:popover-open")) closePanel();
  });
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (state.view === "explore") renderExplore(); }, 120); });
}

async function main() {
  try {
    const res = await fetch("data/clippings.json");
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    $("#loading").hidden = true;
    $("#error").hidden = false;
    return;
  }
  derive();
  $("#loading").hidden = true;
  $("#work").hidden = false;
  wire();
  // The address carries the view, so a link or a reload opens Explore directly.
  setView(location.hash === "#explore" ? "explore" : "normalise");
}

main();
