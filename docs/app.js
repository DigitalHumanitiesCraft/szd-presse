// Zweig Press Clippings: one figure that shows the same clippings once grouped by the catalogue's
// free-text strings and once by modelled periodicals. Data are prebuilt by scripts/model.py.
"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
const YEAR_MIN = 1900;
const YEAR_MAX = 1942;
const TOP_ENTITIES = 12;
const GAMS = "https://gams.uni-graz.at/";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const NOT_READ = [
  { status: "book", label: "book references" },
  { status: "unread", label: "lines not parsed" },
  { status: "none", label: "without publication line" },
];

const $ = (sel) => document.querySelector(sel);
// Internal mode names: "catalogue" is the Model part (rows are catalogue lines), "model" is the
// Explore part (rows are modelled periodicals).
const state = { mode: "catalogue", selected: null, focusIndex: -1 };
let data;
let rowsByMode;
let rowOf;
let dotEls = new Map();
let layoutCache;

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

function cityOf(it) {
  const e = it.entity && data.entityById.get(it.entity);
  return e ? e.city : "unknown";
}

// Rows of both modes. Shown periodicals are the largest ones plus every periodical that a
// split decision produced, so the case "one title, two papers" is always on screen.
function buildRows() {
  const ents = data.entities;
  const shown = ents.slice(0, TOP_ENTITIES);
  for (const e of ents) if (e.split && !shown.includes(e)) shown.push(e);
  const shownIds = new Set(shown.map((e) => e.id));
  const periodicals = data.items.filter((it) => it.status === "periodical");

  const model = shown.map((e) => ({ key: `e:${e.id}`, kind: "entity", entity: e, label: e.label, place: e.place, city: e.city }));
  const rest = ents.filter((e) => !shownIds.has(e.id));
  model.push({ key: "rest", kind: "rest", label: `${rest.length} further periodicals`, entities: rest });
  model.push({ key: "notread", kind: "notread", label: "Not read as a periodical" });

  const forms = new Map();
  for (const it of periodicals) {
    if (!shownIds.has(it.entity)) continue;
    const s = written(it);
    if (!forms.has(s)) forms.set(s, { key: `s:${s}`, kind: "string", label: s, entity: data.entityById.get(it.entity) });
  }
  const restForms = new Set(periodicals.filter((it) => !shownIds.has(it.entity)).map(written));
  const catalogue = [...forms.values()].sort((a, b) => a.label.localeCompare(b.label, "de"));
  catalogue.push({ key: "rest", kind: "rest", label: `${restForms.size} further catalogue lines`, entities: rest });
  catalogue.push({ key: "notread", kind: "notread", label: "Not read as a periodical" });

  rowOf = (it, mode) => {
    if (it.status !== "periodical") return "notread";
    if (!shownIds.has(it.entity)) return "rest";
    return mode === "model" ? `e:${it.entity}` : `s:${written(it)}`;
  };
  return { model, catalogue };
}

function measure() {
  const fig = $("#figure");
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  const width = fig.clientWidth;
  const rows = rowsByMode[state.mode];
  const axisH = 26;
  const footH = 8;
  let height;
  if (narrow) {
    height = rows.reduce((a, r) => a + weightOf(r), 0) * 46 + axisH;
    fig.style.blockSize = `${height}px`;
  } else {
    fig.style.blockSize = "";
    height = fig.clientHeight;
  }
  const labelW = Math.min(narrow ? width * 0.46 : width * 0.36, 400);
  const countW = window.matchMedia("(max-width: 480px)").matches ? 0 : 40;
  return { width, height: height - (narrow ? 0 : footH), axisH, labelW, countW, narrow, plotX0: labelW + 8, plotX1: width - countW - 6 };
}

function xOf(d, L) {
  const t = d.year + ((d.month ?? 7) - 1) / 12 + ((d.day ?? 15) - 1) / 365;
  return L.plotX0 + ((t - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (L.plotX1 - L.plotX0);
}

// Places every dot of one mode: x from the date, stacked within its row around the row's
// centre so that dots of the same months do not hide each other.
function positions(mode, L) {
  const rows = rowsByMode[mode];
  const geo = geometry(rows, L);
  const rowH = geo.unit;
  const r = Math.max(2.6, Math.min(5.5, rowH / 5.2));
  const pos = new Map();
  const bins = new Map();
  const notread = { book: 0, unread: 0, none: 0 };
  const slotW = (L.plotX1 - L.plotX0) / 3;
  for (const it of data.items) {
    const key = rowOf(it, mode);
    const g = geo.byKey.get(key);
    const cy = g.y + g.h / 2;
    let x;
    let y;
    if (key === "notread") {
      const k = NOT_READ.findIndex((g) => g.status === it.status);
      const n = notread[it.status]++;
      // One lane per group; its label stands in the label column at the same height.
      const step = r * 2.4;
      const perLine = Math.max(4, Math.floor((L.plotX1 - L.plotX0 - 8) / step));
      const lane = g.h / NOT_READ.length;
      x = L.plotX0 + 4 + (n % perLine) * step;
      y = g.y + (k + 0.5) * lane + Math.floor(n / perLine) * step;
    } else {
      x = xOf(it.date, L);
      const bin = `${key}|${Math.round(x / (r * 2.1))}`;
      const n = bins.get(bin) ?? 0;
      bins.set(bin, n + 1);
      const step = r * 1.9;
      const off = n === 0 ? 0 : Math.ceil(n / 2) * step * (n % 2 ? -1 : 1);
      const lim = g.h / 2 - r;
      y = cy + Math.max(-lim, Math.min(lim, off));
    }
    pos.set(it.pid, { x, y });
  }
  return { pos, rowH, r, geo };
}

// Group rows get more height: the remainder holds many periodicals, the not-read group holds
// undated dots in three lanes, one per kind.
function weightOf(row) {
  return row.kind === "notread" ? 3.2 : row.kind === "rest" ? 1.6 : 1;
}

function geometry(rows, L) {
  const total = rows.reduce((a, r) => a + weightOf(r), 0);
  const unit = (L.height - L.axisH) / total;
  const byKey = new Map();
  let y = L.axisH;
  for (const row of rows) {
    const h = weightOf(row) * unit;
    byKey.set(row.key, { y, h });
    y += h;
  }
  return { unit, byKey };
}

function svgEl(name, attrs, parent) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function rowCount(row, mode) {
  return data.items.filter((it) => rowOf(it, mode) === row.key).length;
}

function render() {
  const L = measure();
  const svg = $("#chart");
  const mode = state.mode;
  const rows = rowsByMode[mode];
  const P = positions(mode, L);
  layoutCache = { L, P };
  svg.setAttribute("viewBox", `0 0 ${L.width} ${L.height}`);
  svg.setAttribute("width", L.width);
  svg.setAttribute("height", L.height);
  document.body.classList.toggle("mode-catalogue", mode === "catalogue");

  let grid = svg.querySelector(".grid");
  if (!grid) {
    grid = svgEl("g", { class: "grid" }, svg);
    svgEl("g", { class: "rows" }, svg);
    svgEl("g", { class: "axis" }, svg);
    svgEl("g", { class: "notes" }, svg);
    svgEl("g", { class: "dots" }, svg);
  }
  const plotH = L.height - L.axisH;
  grid.replaceChildren();
  const axis = svg.querySelector(".axis");
  axis.replaceChildren();
  for (let y = 1900; y <= 1940; y += 20) {
    const x = xOf({ year: y, month: 1, day: 1 }, L);
    svgEl("line", { x1: x, x2: x, y1: L.axisH - 4, y2: P.geo.byKey.get("notread").y }, grid);
    const t = svgEl("text", { x, y: 15, "text-anchor": "middle" }, axis);
    t.textContent = y;
  }
  const rowsG = svg.querySelector(".rows");
  rowsG.replaceChildren();
  for (const row of rows) {
    if (row.kind === "rest" || row.kind === "notread") {
      const y = P.geo.byKey.get(row.key).y;
      svgEl("line", { class: "rowline", x1: 0, x2: L.width, y1: y, y2: y }, rowsG);
    }
  }
  const notes = svg.querySelector(".notes");
  notes.replaceChildren();

  const dots = svg.querySelector(".dots");
  // The first placement and every resize set positions without animation; only a mode switch animates.
  const instant = !dotEls.size || state.instant;
  svg.classList.toggle("instant", instant);
  if (!dotEls.size) {
    for (const it of data.items) {
      const c = svgEl("circle", { r: P.r, cx: 0, cy: 0, class: `dot c-${it.status === "periodical" ? cityOf(it) : "unknown"}${it.status === "periodical" ? "" : " hollow"}` }, dots);
      c.dataset.pid = it.pid;
      dotEls.set(it.pid, c);
    }
  }
  for (const it of data.items) {
    const c = dotEls.get(it.pid);
    const p = P.pos.get(it.pid);
    c.setAttribute("r", P.r);
    c.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }
  if (instant) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove("instant")));
  state.instant = false;
  renderLabels(rows, L, P);
  applySelection();
  renderKey();
  $("#chart-desc").textContent = mode === "model"
    ? "Rows are periodicals with their place; dots are clippings placed by date."
    : "Rows are the publication strings exactly as written in the catalogue; dots are clippings placed by date.";
}

// Key beside the switch: says what the colours and the two signs mean in the current mode.
function renderKey() {
  const sw = (c, t) => `<span class="sw c-text-${c}"><svg aria-hidden="true" width="12" height="12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>${t}</span>`;
  // Status of every mark: filled is a proposal by rule, a ringed mark would be confirmed by a person.
  const status = `<span class="sw st"><svg aria-hidden="true" width="12" height="12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>proposal by rule</span><span class="sw st"><svg aria-hidden="true" width="14" height="14"><circle cx="7" cy="7" r="4" fill="currentColor"/><circle cx="7" cy="7" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>confirmed by a person, none yet</span>`;
  $("#key").innerHTML = state.mode === "model"
    ? `${sw("Wien", "Wien")} ${sw("Berlin", "Berlin")} ${sw("other", "other places")} ${sw("unknown", "place unknown")}<span class="sw">${icon("merge")}forms joined</span><span class="sw">${icon("split")}title split</span>${status}`
    : status;
}

function renderLabels(rows, L, P) {
  let box = $("#figure .labels");
  if (!box) {
    box = document.createElement("div");
    box.className = "labels";
    $("#figure").appendChild(box);
  }
  box.style.inlineSize = `${L.width}px`;
  const fontPx = Math.max(12, Math.min(17, P.rowH * 0.58));
  box.replaceChildren();
  rows.forEach((row) => {
    const g = P.geo.byKey.get(row.key);
    const b = document.createElement("button");
    b.type = "button";
    b.className = `rowlabel${row.kind === "rest" || row.kind === "notread" ? " group" : ""}`;
    b.style.top = `${g.y}px`;
    b.style.blockSize = `${row.kind === "notread" ? g.h : Math.min(g.h, P.rowH * 1.6)}px`;
    if (row.kind === "notread") b.setAttribute("aria-label", `Not read as a periodical: ${NOT_READ.map((x) => `${data.status[x.status] ?? 0} ${x.label}`).join(", ")}`);
    b.style.inlineSize = `${L.labelW}px`;
    b.style.fontSize = `${fontPx}px`;
    b.dataset.key = row.key;
    let inner = row.kind === "notread"
      ? `<span class="rl-lane">${NOT_READ.map((x) => `${data.status[x.status] ?? 0} ${esc(x.label)}`).join("\n")}</span>`
      : `<span class="rl-name">${esc(row.label)}</span>`;
    if (row.kind === "entity") {
      const e = row.entity;
      inner += `<span class="rl-place c-text-${e.city}">${esc(e.place ?? "place unknown")}</span>`;
      const icons = [];
      if (e.merged) icons.push(icon("merge", `${Object.keys(e.titleForms).length} title forms, ${Object.keys(e.placeForms).length} place forms joined`));
      if (e.split) icons.push(icon("split", "same title as another periodical, separated by place"));
      if (icons.length) inner += `<span class="rl-icons">${icons.join("")}</span>`;
    }
    b.innerHTML = inner;
    if (row.kind === "notread") b.querySelector(".rl-lane").style.lineHeight = `${g.h / NOT_READ.length}px`;
    b.setAttribute("aria-pressed", String(isRowSelected(row)));
    b.addEventListener("click", (ev) => { viaKeyboard(ev); selectRow(row); });
    box.appendChild(b);
    const cnt = document.createElement("span");
    cnt.className = "rowcount";
    cnt.style.top = `${g.y + g.h / 2 - 9}px`;
    cnt.style.fontSize = `${Math.max(12, fontPx - 2)}px`;
    cnt.textContent = row.kind === "notread" ? "" : rowCount(row, state.mode);
    cnt.setAttribute("aria-hidden", "true");
    box.appendChild(cnt);
  });
}

function isRowSelected(row) {
  const s = state.selected;
  if (!s) return false;
  if (s.type === "entity") return row.kind === "entity" ? row.entity.id === s.id : (row.kind === "string" && row.entity.id === s.id);
  return s.type === row.kind;
}

// Highlight: an opened periodical keeps its dots strong in both modes, so switching the mode
// shows its scattered strings joining into one row.
function applySelection() {
  const s = state.selected;
  for (const it of data.items) {
    const c = dotEls.get(it.pid);
    let on = true;
    if (s?.type === "entity") on = it.entity === s.id || (s.alsoIds ?? []).includes(it.entity);
    else if (s?.type === "item") on = true;
    c.classList.toggle("dim", !on);
    c.classList.toggle("sel", s?.type === "item" && s.id === it.pid);
  }
  document.querySelectorAll(".rowlabel").forEach((b) => {
    const row = rowsByMode[state.mode].find((r) => r.key === b.dataset.key);
    b.setAttribute("aria-pressed", String(isRowSelected(row)));
  });
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  document.querySelectorAll(".mode button").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.mode === mode));
    b.tabIndex = b.dataset.mode === mode ? 0 : -1;
  });
  render();
  $("#live").textContent = mode === "model" ? "Explore: one row per periodical." : "Model: one row per catalogue line.";
}

function selectRow(row) {
  if (row.kind === "entity" || row.kind === "string") return openEntity(row.entity.id);
  if (row.kind === "rest") return openRest();
  return openNotRead();
}

function select(sel, html) {
  if (state.kbOpen) state.returnTo = document.activeElement;
  state.selected = sel;
  applySelection();
  const panel = $("#panel");
  panel.innerHTML = (sel ? `<button type="button" class="back" aria-label="Back to the overview">${icon("close")}</button>` : "") + html;
  panel.querySelector(".back")?.addEventListener("click", () => closePanel());
  panel.querySelectorAll("[data-entity]").forEach((b) => b.addEventListener("click", (ev) => { viaKeyboard(ev); openEntity(b.dataset.entity); }));
  panel.querySelectorAll("[data-pid]").forEach((b) => b.addEventListener("click", (ev) => { viaKeyboard(ev); openItem(b.dataset.pid); }));
  panel.querySelectorAll("[data-case]").forEach((b) => b.addEventListener("click", (ev) => { viaKeyboard(ev); openCase(b.dataset.case); }));
  panel.scrollTop = 0;
  if (state.kbOpen) panel.focus();
  state.kbOpen = false;
}

// Keyboard activation (Enter, Space, or a click event without pointer) moves focus into the panel.
function viaKeyboard(ev) {
  state.kbOpen = !ev || ev.detail === 0;
}

// Back to the overview; focus returns to the row or dot that opened the panel.
function closePanel() {
  const back = state.returnTo;
  state.returnTo = null;
  openHome(false);
  if (back && back.isConnected && back !== document.body) back.focus();
  else $("#panel").focus();
}

function openHome(focus) {
  const total = data.items.length;
  select(null, `
    <p>Each mark is one of ${total} press clippings Stefan Zweig kept. In Model, rules propose how the catalogue's free-text lines join into periodicals; Explore shows the result by year. Open a row or a mark.</p>
    <button type="button" class="case" data-case="frankfurter">Frankfurter Zeitung: four place forms, one newspaper</button>
    <button type="button" class="case" data-case="morgen">Der Morgen: one title, two periodicals</button>
  `);
  if (focus) $("#panel").focus();
}

function openCase(name) {
  if (name === "frankfurter") {
    const e = data.entities.find((x) => x.label === "Frankfurter Zeitung");
    if (state.mode !== "catalogue") setMode("catalogue");
    openEntity(e.id);
  } else {
    const ms = data.entities.filter((x) => x.label === "Der Morgen");
    if (state.mode !== "model") setMode("model");
    openEntity(ms[0].id, ms.slice(1).map((x) => x.id));
  }
}

function openEntity(id, alsoIds = []) {
  const e = data.entityById.get(id);
  const items = data.items.filter((it) => it.entity === id).sort((a, b) => xKey(a) - xKey(b));
  const decisions = new Map();
  for (const it of items) for (const d of it.decisions) decisions.set(d.text, d);
  const titleForms = Object.entries(e.titleForms).sort((a, b) => b[1] - a[1]);
  const placeForms = Object.entries(e.placeForms).sort((a, b) => b[1] - a[1]);
  const folded = titleForms.length > 1 && titleForms.some(([f]) => ![...decisions.values()].some((d) => d.text.includes(`“${f}”`)) && f !== e.label);
  const sibling = alsoIds.map((x) => data.entityById.get(x));
  select({ type: "entity", id, alsoIds }, `
    <h2>${esc(e.label)} <span class="place c-text-${e.city}">${esc(e.place ?? "place unknown")}</span></h2>
    <p>Written in the catalogue as</p>
    <ul>${titleForms.map(([f, n]) => `<li><span class="str">${esc(f)}</span> <span class="n">${n}</span></li>`).join("")}</ul>
    <p>with the place</p>
    <ul>${placeForms.map(([f, n]) => `<li><span class="str">${esc(f)}</span> <span class="n">${n}</span></li>`).join("")}</ul>
    ${folded ? `<p class="decision">${icon("merge")}<span>Joined by rule: ${esc(data.foldRule)}.</span></p>` : ""}
    ${[...decisions.values()].map((d) => `<p class="decision">${icon(d.kind === "alias" ? "merge" : d.kind)}<span>${esc(d.text)}</span></p>`).join("")}
    ${sibling.map((s) => `<p class="decision">${icon("split")}<span>The other periodical of this title: <button type="button" class="linkish" data-entity="${esc(s.id)}">${esc(s.label)}, ${esc(s.place)}</button></span></p>`).join("")}
    <p>Clippings</p>
    <div class="years">${items.map((it) => `<button type="button" class="linkish" data-pid="${esc(it.pid)}">${esc(dateText(it.date))}</button>`).join("")}</div>
  `);
  $("#live").textContent = `${e.label} opened.`;
}

function xKey(it) {
  return it.date ? it.date.year * 400 + (it.date.month ?? 0) * 32 + (it.date.day ?? 0) : 0;
}

function openRest() {
  const row = rowsByMode.model.find((r) => r.kind === "rest");
  select({ type: "rest" }, `
    <h2>${esc(row.label)}</h2>
    <ul>${row.entities.map((e) => `<li><button type="button" class="linkish" data-entity="${esc(e.id)}">${esc(e.label)}</button> <span class="c-text-${e.city}">${esc(e.place ?? "place unknown")}</span> <span class="n">${e.count}</span></li>`).join("")}</ul>
  `);
}

function openNotRead() {
  const groups = NOT_READ.map((g) => {
    const its = data.items.filter((it) => it.status === g.status);
    return `<p><strong>${its.length} ${esc(g.label)}</strong></p><ul>${its.map((it) => `<li><button type="button" class="linkish" data-pid="${esc(it.pid)}">${esc(it.raw || it.title)}</button></li>`).join("")}</ul>`;
  });
  select({ type: "notread" }, `<h2>Not read as a periodical</h2><p>Book references, strings the parser leaves unread rather than guessing, and clippings whose record names no publication.</p>${groups.join("")}`);
}

function openItem(pid) {
  const it = data.items.find((x) => x.pid === pid);
  const e = it.entity && data.entityById.get(it.entity);
  const img = it.image ? `<figure class="facs"><a href="${GAMS}${esc(pid)}"><img src="img/${esc(pid.replace(":", "_"))}.jpg" alt="First page of the clipping ${esc(it.signature)}" loading="lazy"></a><figcaption>Facsimile: Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY 4.0</figcaption></figure>` : "";
  let model;
  if (it.status === "periodical") {
    const bits = [it.date && dateText(it.date), it.issue, it.pages && `p. ${it.pages}`].filter(Boolean).map(esc).join(", ");
    model = `<div class="model-line"><button type="button" class="linkish" data-entity="${esc(e.id)}"><strong>${esc(e.label)}</strong></button>, <span class="c-text-${e.city}">${esc(e.place ?? "place unknown")}</span>${bits ? `, ${bits}` : ""}</div>`;
  } else {
    model = `<div class="model-line">${{ book: "Book reference, not a periodical", unread: "Not read: the parser leaves this string as it is", none: "No publication reference in the record" }[it.status]}</div>`;
  }
  select({ type: "item", id: pid }, `
    <h2>${esc(it.title)}</h2>
    ${img}
    <div class="compare">
      <div><div class="k">Catalogue line</div>${it.raw ? `<span class="str">${esc(it.raw)}</span>` : "<em>no reference</em>"}</div>
      <div><div class="k">Read by rule as</div>${model}</div>
    </div>
    ${it.decisions.map((d) => `<p class="decision">${icon(d.kind === "alias" ? "merge" : d.kind)}<span>${esc(d.text)}</span></p>`).join("")}
    <p><span class="status">proposal by rule, not confirmed</span></p>
    <p>${esc(it.signature)}, <a class="dh-icon-link" href="${GAMS}${esc(pid)}">Facsimile in Stefan Zweig Digital ${icon("ext")}</a></p>
  `);
  $("#live").textContent = `Clipping ${it.signature} opened.`;
}

// Tooltip and keyboard on the dots
function showTip(it, p) {
  const tip = $("#tip");
  tip.innerHTML = `<code>${esc(it.raw || "no reference")}</code>`;
  tip.hidden = false;
  const fig = $("#figure").getBoundingClientRect();
  const left = Math.min(p.x + 12, fig.width - tip.offsetWidth - 4);
  tip.style.left = `${Math.max(0, left)}px`;
  tip.style.top = `${Math.max(0, p.y - tip.offsetHeight - 10)}px`;
}

function orderedItems() {
  const rows = rowsByMode[state.mode];
  const idx = new Map(rows.map((r, i) => [r.key, i]));
  return [...data.items].sort((a, b) => (idx.get(rowOf(a, state.mode)) - idx.get(rowOf(b, state.mode))) || (xKey(a) - xKey(b)));
}

function moveFocus(delta) {
  const list = orderedItems();
  state.focusIndex = Math.max(0, Math.min(list.length - 1, state.focusIndex + delta));
  dotEls.forEach((c) => c.classList.remove("kfocus"));
  const it = list[state.focusIndex];
  dotEls.get(it.pid).classList.add("kfocus");
  showTip(it, layoutCache.P.pos.get(it.pid));
  return it;
}

function wire() {
  document.querySelectorAll(".mode button").forEach((b) => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
    b.tabIndex = b.dataset.mode === state.mode ? 0 : -1;
  });
  $(".mode").addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
      const next = state.mode === "catalogue" ? "model" : "catalogue";
      setMode(next);
      document.querySelector(`.mode [data-mode="${next}"]`).focus();
      ev.preventDefault();
    }
  });
  const svg = $("#chart");
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-label", "Clippings by row and year. Arrow keys move between dots, Enter opens one.");
  svg.addEventListener("pointermove", (ev) => {
    const c = ev.target.closest?.(".dot");
    if (!c) { $("#tip").hidden = true; return; }
    const it = data.items.find((x) => x.pid === c.dataset.pid);
    showTip(it, layoutCache.P.pos.get(it.pid));
  });
  svg.addEventListener("pointerleave", () => { $("#tip").hidden = true; });
  svg.addEventListener("click", (ev) => {
    const c = ev.target.closest?.(".dot");
    if (c) openItem(c.dataset.pid);
  });
  svg.addEventListener("keydown", (ev) => {
    const map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 };
    if (ev.key in map) {
      moveFocus(state.focusIndex < 0 ? 1 : map[ev.key]);
      ev.preventDefault();
    } else if ((ev.key === "Enter" || ev.key === " ") && state.focusIndex >= 0) {
      state.kbOpen = true;
      openItem(orderedItems()[state.focusIndex].pid);
      ev.preventDefault();
    } else if (ev.key === "Escape") {
      $("#tip").hidden = true;
    }
  });
  svg.addEventListener("blur", () => { $("#tip").hidden = true; dotEls.forEach((c) => c.classList.remove("kfocus")); });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && state.selected && !document.querySelector(".about:popover-open")) closePanel();
  });
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { state.instant = true; render(); }, 120); });
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
  data.entityById = new Map(data.entities.map((e) => [e.id, e]));
  rowsByMode = buildRows();
  $("#loading").hidden = true;
  $("#work").hidden = false;
  wire();
  render();
  openHome(false);
}

main();
