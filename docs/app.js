// Zweig Press Clippings: two views on one dataset. Normalise lists the rules' proposals for joining
// catalogue lines into periodicals, the uncertain first; Explore shows the modelled clippings by
// periodical and year. The side panel is legend and filter for both. Data, kinds of case and the
// counts the page shows are prebuilt and tested by scripts/model.py.
import { openViewer, closeViewer, isOpen, wireViewer } from "./viewer.js";

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
// Kinds of case, each a property of one clipping's own catalogue line; a clipping can carry several.
// One sign per meaning, used in the side panel, both views and the detail panel.
const CASES = [
  { key: "joined", icon: "merge", label: "spelling folded", tip: "the clipping's own line was written differently and joined by the folding rule (case, leading article, Litteratur)" },
  { key: "alias", icon: "alias", label: "editorial alias", tip: "a written title or place read as another by a stated editorial decision" },
  { key: "split", icon: "split", label: "title split", tip: "one title written with two places, taken as two periodicals" },
  { key: "infer", icon: "infer", label: "place inferred", tip: "no place written; taken from the other lines of the same periodical" },
  { key: "supplement", icon: "supp", label: "supplement", tip: "a supplement written into the place, kept as a periodical of its own" },
  { key: "unread", icon: "unread", label: "not parsed", tip: "the parser leaves the line as it is rather than guess" },
  { key: "book", icon: "book", label: "book reference", tip: "the line names a book, not a periodical" },
  { key: "none", icon: "none", label: "no publication line", tip: "the record names no publication" },
];
const CASE = Object.fromEntries(CASES.map((c) => [c.key, c]));
const ENTITY_SIGNS = ["joined", "alias", "split", "infer", "supplement"];
const LOOSE = ["unread", "book", "none"];
// Criteria of "Possible same periodical", each with its sign; the candidates come from scripts/candidates.py.
const CRITERIA = {
  supplement: { icon: "supp", label: "supplement beside its paper", tip: "a supplement in the same place as the periodical whose title it names" },
  combined: { icon: "combined", label: "title within a combined title", tip: "a title written as two titles joined by a slash, beside one of them" },
  prefix: { icon: "prefix", label: "unparsed line begins with a known title", tip: "a line the parser could not read whose text begins with a periodical already in the register" },
  near: { icon: "near", label: "near-identical titles", tip: "two titles within two letters of each other" },
};

const $ = (sel) => document.querySelector(sel);
const state = { view: "normalise", filter: null, selected: null, focusIndex: -1, byCity: false, back: null };
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

// A sign in a row: icon with its name for screen readers and a tooltip on hover.
function sign(kind) {
  const c = CASE[kind];
  return `<span class="sign">${icon(c.icon, c.label)}<span class="tipbox" aria-hidden="true">${esc(c.label)}</span></span>`;
}

function critSign(key) {
  const c = CRITERIA[key];
  return `<span class="sign">${icon(c.icon, c.label)}<span class="tipbox" aria-hidden="true">${esc(c.label)}</span></span>`;
}

function written(it) {
  return it.placeWritten ? `${it.written}, ${it.placeWritten}` : it.written;
}

function modelled(e) {
  return e.place ? `${e.label}, ${e.place}` : e.label;
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

function derive() {
  data.entityById = new Map(data.entities.map((e) => [e.id, e]));
  for (const it of data.items) {
    const e = it.entity && data.entityById.get(it.entity);
    it.city = e ? e.city : null;
    it.kinds = new Set(it.cases);
  }
  for (const e of data.entities) {
    e.items = data.items.filter((it) => it.entity === e.id);
    const forms = new Map();
    for (const it of e.items) forms.set(written(it), (forms.get(written(it)) ?? 0) + 1);
    e.forms = [...forms.entries()].sort((a, b) => b[1] - a[1]);
    e.kinds = ENTITY_SIGNS.filter((k) => e.items.some((it) => it.kinds.has(k)));
    // Stated criterion for a decision: a split title, an inferred place, an editorial alias or a supplement.
    e.needs = e.kinds.some((k) => k !== "joined");
  }
}

function matches(it) {
  const f = state.filter;
  if (!f) return true;
  if (f.type === "city") return it.status === "periodical" && (data.entityById.get(it.entity).place ?? "") === f.key;
  return f.type === "place" ? it.city === f.key : it.kinds.has(f.key);
}

// Side panel: legend and filter. Places are disjoint and sum to the placed clippings; kinds of
// case overlap. Both counts come from data.counts, which tests/test_rules.py checks.
function renderRail() {
  const c = data.counts;
  const btn = (type, key, inner, tip, n, name) => {
    const on = state.filter?.type === type && state.filter.key === key;
    return `<button type="button" class="rail-item${on ? " on" : ""}" aria-pressed="${on}" data-type="${type}" data-key="${key}" aria-label="${esc(name)}, ${n} clippings" aria-describedby="rt-${key}">${inner}<span class="n">${n}</span><span class="tipbox" role="tooltip" id="rt-${key}">${esc(tip)}</span></button>`;
  };
  $("#rail").innerHTML = `
    <div class="rail-group" role="group" aria-label="Place of publication, each placed clipping once">
      <p class="rail-label">Place, each clipping once; ${c.notPlaced} not placed</p>
      ${PLACES.map((p) => btn("place", p.key, `<span class="sw city-${p.key}" aria-hidden="true"></span><span class="rl">${esc(p.label)}</span>`, `clippings in periodicals of ${p.label}`, c.places[p.key] ?? 0, p.label)).join("")}
    </div>
    <div class="rail-group" role="group" aria-label="Kinds of case, a clipping can have several">
      <p class="rail-label">Kinds of case, may overlap</p>
      ${CASES.map((k) => btn("case", k.key, `${icon(k.icon)}<span class="rl">${esc(k.label)}</span>`, k.tip, c.cases[k.key] ?? 0, k.label)).join("")}
    </div>
    ${state.filter ? `<button type="button" class="rail-reset" id="reset">${state.filter.type === "city" ? `${esc(state.filter.key || "place unknown")}, show all` : "Show all"}</button>` : ""}
    <p class="rail-status">Every join is a proposal by rule; none is confirmed yet.</p>`;
  $("#rail").querySelectorAll(".rail-item").forEach((b) => b.addEventListener("click", () => {
    const same = state.filter?.type === b.dataset.type && state.filter.key === b.dataset.key;
    state.filter = same ? null : { type: b.dataset.type, key: b.dataset.key };
    state.focusIndex = -1;
    refresh();
    const again = $(`#rail [data-key="${b.dataset.key}"]`);
    again?.focus();
    // In Explore the clippings without a place have no position on the time axis; the side panel
    // entry shows them in the detail panel instead.
    if (!same && state.view === "explore" && LOOSE.includes(b.dataset.key)) openLoose(b.dataset.key, again);
  }));
  $("#reset")?.addEventListener("click", () => { state.filter = null; state.focusIndex = -1; refresh(); $("#rail .rail-item").focus(); });
}

// Facsimile previews in a row: a few small first pages, then the number of the rest. They are
// images inside the row's button, so a row stays one control; a click on one opens that clipping,
// the keyboard reaches the same pages through the row's detail panel.
const PREVIEWS = 5;
function previews(items) {
  const shown = items.filter((it) => it.image).slice(0, PREVIEWS);
  if (!shown.length) return "";
  const rest = items.length - shown.length;
  return `<span class="previews">${shown.map((it) => `<img src="img/${esc(it.pid.replace(":", "_"))}.jpg" alt="Facsimile of ${esc(it.signature)}" loading="lazy" data-pid="${esc(it.pid)}">`).join("")}${rest > 0 ? `<span class="more">+${rest}</span>` : ""}</span>`;
}

function expanded(sel) {
  const s = state.selected;
  return Boolean(s && sel && s.type === sel.type && s.id === sel.id);
}

// Normalise: one row per proposal, grouped by what needs an expert first. Nothing is hidden behind
// an expander; the list scrolls in its own area.
function renderNormalise() {
  const ents = data.entities.filter((e) => e.items.some(matches));
  const weight = (e) => (e.kinds.includes("infer") ? 0 : e.kinds.includes("supplement") ? 1 : 2);
  const splits = ents.filter((e) => e.kinds.includes("split")).sort((a, b) => a.label.localeCompare(b.label, "de") || b.count - a.count);
  const inferred = ents.filter((e) => e.needs && !e.kinds.includes("split")).sort((a, b) => weight(a) - weight(b) || b.count - a.count);
  const joined = ents.filter((e) => !e.needs && e.forms.length > 1).sort((a, b) => b.count - a.count);
  const unchanged = ents.filter((e) => !e.needs && e.forms.length === 1).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"));
  const cands = data.candidates.map((c, i) => ({ ...c, i })).filter((c) => sideItems(c.a).concat(sideItems(c.b)).some(matches));
  const inCand = new Set(data.candidates.filter((c) => c.criterion === "prefix").map((c) => c.a));
  const unread = data.items.filter((it) => it.status === "unread" && matches(it) && !inCand.has(it.pid));
  const dateUnread = unread.filter((it) => it.unreadCause === "date-unread");
  const noPeriodical = unread.filter((it) => it.unreadCause !== "date-unread");
  const setAside = ["book", "none"].map((k) => ({ kind: k, items: data.items.filter((it) => it.status === k && matches(it)) })).filter((g) => g.items.length);

  // Only the catalogue forms that differ from the modelled periodical are shown; the head count
  // goes when it would repeat the count of the only form shown.
  const entRow = (e) => {
    const on = expanded({ type: "entity", id: e.id });
    const forms = e.forms.filter(([f]) => f !== modelled(e));
    const repeat = forms.length === 1 && forms[0][1] === e.count;
    const name = `${e.label}, ${e.place ?? "place unknown"}, ${e.count} ${e.count === 1 ? "clipping" : "clippings"}`;
    return `<li><button type="button" class="prop${on ? " on" : ""}" aria-expanded="${on}" aria-controls="panel" aria-label="${esc(name)}" data-entity="${esc(e.id)}">
      <span class="prop-head"><span class="sw city-${e.city}" aria-hidden="true"></span><span class="prop-name">${esc(e.label)}</span> <span class="prop-place ctext city-${e.city}">${esc(e.place ?? "place unknown")}</span>${e.kinds.length ? `<span class="signs">${e.kinds.map(sign).join("")}</span>` : ""}${repeat ? "" : `<span class="prop-n">${e.count}</span>`}</span>
      ${forms.length ? `<span class="chips">${forms.map(([f, n]) => `<code class="chip">${esc(f)}  ${n}</code>`).join("")}</span>` : ""}
      ${previews(e.items)}
    </button></li>`;
  };
  const itemRow = (it) => {
    const on = expanded({ type: "item", id: it.pid });
    return `<li><button type="button" class="prop${on ? " on" : ""}" aria-expanded="${on}" aria-controls="panel" aria-label="${esc(`${it.title}, ${it.signature}, not parsed`)}" data-item="${esc(it.pid)}">
      <span class="prop-head">${sign("unread")}<span class="prop-name">${esc(it.title)}</span> <span class="prop-sig">${esc(it.signature)}</span></span>
      <span class="chips"><code class="chip">${esc(it.raw)}</code></span>
      ${previews([it])}
    </button></li>`;
  };
  const candRow = (c) => {
    const on = expanded({ type: "cand", id: String(c.i) });
    const crit = CRITERIA[c.criterion];
    const items = sideItems(c.a).concat(sideItems(c.b));
    return `<li><button type="button" class="prop cand${on ? " on" : ""}" aria-expanded="${on}" aria-controls="panel" aria-label="${esc(`${sideLabel(c.a)} and ${sideLabel(c.b)}: ${crit.label}`)}" data-cand="${c.i}">
      <span class="prop-head">${critSign(c.criterion)}<span class="prop-name">${esc(`${sideLabel(c.a)}  and  ${sideLabel(c.b)}`)}</span></span>
      <span class="chips"><span class="crit">${esc(crit.label)}</span></span>
      ${previews(items)}
    </button></li>`;
  };
  const looseRow = (g) => {
    const c = CASE[g.kind];
    const on = expanded({ type: "loose", id: g.kind });
    return `<li><button type="button" class="prop loose${on ? " on" : ""}" aria-expanded="${on}" aria-controls="panel" aria-label="${esc(`${c.label}, ${g.items.length} clippings`)}" data-loose="${g.kind}">
      <span class="prop-head">${sign(g.kind)}<span class="prop-name">${esc(c.label)}</span><span class="prop-n">${g.items.length}</span></span>
      <span class="chips">${g.items.map((it) => `<code class="chip">${esc(it.raw || it.title)}</code>`).join("")}</span>
      ${previews(g.items)}
    </button></li>`;
  };
  const group = (title, rows) => rows.length ? `<section class="pgroup"><h2>${esc(title)}</h2><ul class="props">${rows.join("")}</ul></section>` : "";
  $("#normalise").innerHTML =
    group("One title, two places", splits.map(entRow)) +
    group("Possible same periodical, not joined", cands.map(candRow)) +
    group("Not parsed: title known, date or issue unread", dateUnread.map(itemRow)) +
    group("Not parsed: no periodical named", noPeriodical.map(itemRow)) +
    group("Place inferred, alias or supplement", inferred.map(entRow)) +
    group("Joined by rule", joined.map(entRow)) +
    group("Set aside by rule", setAside.map(looseRow)) +
    group("Unchanged, one form each", unchanged.map(entRow)) +
    (ents.length || unread.length || setAside.length || cands.length ? "" : '<p class="state">No clipping matches this filter. Choose "Show all" in the side panel.</p>');
  const preview = (ev, b) => { const img = ev.target.closest("img[data-pid]"); if (img) { openItem(img.dataset.pid, b); return true; } return false; };
  const root = $("#normalise");
  root.querySelectorAll("[data-entity]").forEach((b) => b.addEventListener("click", (ev) => { if (!preview(ev, b)) openEntity(b.dataset.entity, b); }));
  root.querySelectorAll("[data-item]").forEach((b) => b.addEventListener("click", () => openItem(b.dataset.item, b)));
  root.querySelectorAll("[data-cand]").forEach((b) => b.addEventListener("click", (ev) => { if (!preview(ev, b)) openCandidate(Number(b.dataset.cand), b); }));
  root.querySelectorAll("[data-loose]").forEach((b) => b.addEventListener("click", (ev) => { if (!preview(ev, b)) openLoose(b.dataset.loose, b); }));
}

// A side of a candidate is either a periodical (entity id) or a single clipping (pid).
function sideItems(x) {
  const e = data.entityById.get(x);
  return e ? e.items : data.items.filter((it) => it.pid === x);
}

function sideLabel(x) {
  const e = data.entityById.get(x);
  if (e) return e.place ? `${e.label}, ${e.place}` : e.label;
  return data.items.find((it) => it.pid === x).raw;
}

// Explore: rows by count under the active filter, the largest periodicals (or cities) first, the
// rest in one remainder row. Clippings without a place are not drawn on the time axis.
const MAX_ROWS = 12;
function exploreRows() {
  const placed = data.items.filter((it) => it.status === "periodical" && matches(it));
  const groupOf = state.byCity ? (it) => `city:${data.entityById.get(it.entity).place ?? ""}` : (it) => it.entity;
  const counts = new Map();
  for (const it of placed) counts.set(groupOf(it), (counts.get(groupOf(it)) ?? 0) + 1);
  const keys = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, "de"));
  const shown = keys.length > MAX_ROWS + 1 ? keys.slice(0, MAX_ROWS) : keys;
  const ids = new Set(shown);
  const rows = shown.map((k) => (state.byCity
    ? { key: k, kind: "city", city: k.slice(5), count: counts.get(k) }
    : { key: k, kind: "entity", entity: data.entityById.get(k), count: counts.get(k) }));
  const restKeys = keys.filter((k) => !ids.has(k));
  if (restKeys.length) {
    const n = restKeys.reduce((a, k) => a + counts.get(k), 0);
    rows.push({ key: "rest", kind: "rest", label: `Remainder: ${restKeys.length} further ${state.byCity ? "places" : "periodicals"}`, keys: restKeys, count: n });
  }
  const rowOf = (it) => (it.status !== "periodical" || !matches(it) ? null : ids.has(groupOf(it)) ? groupOf(it) : restKeys.length ? "rest" : null);
  return { rows, rowOf, placed };
}

function measure() {
  const fig = $("#figure");
  const width = fig.clientWidth;
  const height = fig.clientHeight;
  const narrow = width < 600;
  // Titles keep at least about 300 px, also when the detail panel narrows the figure.
  const labelW = narrow ? width * 0.46 : Math.min(420, Math.max(300, width * 0.35));
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

// Stacks marks of the same row that fall into the same horizontal slot, centred on the row, so no
// mark lies on another; a row is as tall as its highest stack needs.
function stackRows(rows, rowOf, placed, L, rad) {
  const slots = new Map();
  for (const it of placed) {
    const key = rowOf(it);
    if (!key) continue;
    const slot = `${key}|${Math.round(xOf(it.date, L) / (rad * 2.05))}`;
    if (!slots.has(slot)) slots.set(slot, []);
    slots.get(slot).push(it);
  }
  const maxStack = new Map(rows.map((r) => [r.key, 1]));
  for (const [slot, its] of slots) {
    const key = slot.slice(0, slot.lastIndexOf("|"));
    maxStack.set(key, Math.max(maxStack.get(key), its.length));
  }
  return { slots, maxStack };
}

function renderExplore() {
  const fig = $("#figure");
  const narrow = fig.clientWidth < 600;
  const { rows, rowOf, placed } = exploreRows();
  if (narrow) fig.style.blockSize = `${rows.length * 60 + 120}px`; else fig.style.blockSize = "";
  const L = measure();
  const stripH = 44;
  const top = L.axisH + stripH;
  const avail = L.height - top - 6;
  // Choose the mark size so that every row fits its highest stack, with a minimum row height for
  // the label; shrink the marks until the rows fit the stage.
  let rad = 8;
  let st;
  let need;
  const minRow = narrow ? 44 : 26;
  for (let i = 0; i < 12; i += 1) {
    st = stackRows(rows, rowOf, placed, L, rad);
    need = rows.map((r) => Math.max(minRow, st.maxStack.get(r.key) * rad * 2.05 + rad));
    const total = need.reduce((a, b) => a + b, 0);
    if (total <= avail || rad <= 2.5) break;
    rad = Math.max(2.5, rad * Math.sqrt(avail / total) * 0.98);
  }
  const total = need.reduce((a, b) => a + b, 0);
  const extra = Math.max(0, avail - total) / rows.length;
  const geo = new Map();
  let y = top;
  rows.forEach((r, i) => { const h = need[i] + extra; geo.set(r.key, { y, h }); y += h; });
  const font = Math.max(13, Math.min(20, minRow * 0.62 + extra * 0.1));

  const svg = $("#chart");
  svg.setAttribute("width", L.width);
  svg.setAttribute("height", L.height);
  svg.replaceChildren();
  const grid = svgEl("g", { class: "grid" }, svg);
  for (let yr = 1900; yr <= 1940; yr += 10) {
    const x = xOf({ year: yr, month: 1, day: 1 }, L);
    svgEl("line", { x1: x, x2: x, y1: L.axisH - 4, y2: L.height }, grid);
    if (!narrow || yr % 20 === 0) svgEl("text", { x, y: 16, "text-anchor": "middle", class: "axis" }, grid).textContent = yr;
  }
  // Distribution over the years: one exact bar per year for the clippings under the filter.
  const perYear = new Map();
  for (const it of placed) perYear.set(it.date.year, (perYear.get(it.date.year) ?? 0) + 1);
  const maxYear = Math.max(1, ...perYear.values());
  const strip = svgEl("g", { class: "years-strip", role: "img", "aria-label": `Clippings per year, at most ${maxYear} in one year` }, svg);
  for (const [yr, n] of perYear) {
    const x0 = xOf({ year: yr, month: 1, day: 1 }, L);
    const x1 = xOf({ year: yr + 1, month: 1, day: 1 }, L);
    const h = (n / maxYear) * (stripH - 10);
    svgEl("rect", { x: x0 + 0.5, y: L.axisH + stripH - 4 - h, width: Math.max(1, x1 - x0 - 1), height: h, class: "ybar" }, strip);
  }
  const rest = geo.get("rest");
  if (rest) svgEl("rect", { x: 0, y: rest.y, width: L.width, height: rest.h, class: "restband" }, grid);

  const pos = new Map();
  for (const [slot, its] of st.slots) {
    const key = slot.slice(0, slot.lastIndexOf("|"));
    const g = geo.get(key);
    its.sort((a, b) => xKey(a) - xKey(b));
    its.forEach((it, k) => {
      const off = (k - (its.length - 1) / 2) * rad * 2.05;
      pos.set(it.pid, { x: xOf(it.date, L), y: g.y + g.h / 2 + off });
    });
  }
  const dots = svgEl("g", {}, svg);
  dotEls = new Map();
  for (const it of data.items) {
    const p = pos.get(it.pid);
    if (!p) continue;
    const c = svgEl("circle", { cx: p.x, cy: p.y, r: Math.max(2, rad - 0.6), class: `dot city-${it.city}` }, dots);
    c.dataset.pid = it.pid;
    dotEls.set(it.pid, c);
  }
  layout = { L, pos, rows, rowOf };

  // Row labels are buttons over the SVG so they wrap, take focus and open the periodical or city.
  const box = document.createElement("div");
  box.className = "labels";
  box.style.inlineSize = `${L.width}px`;
  fig.querySelector(".labels")?.remove();
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "group-toggle";
  toggle.id = "group-toggle";
  toggle.setAttribute("aria-pressed", String(state.byCity));
  toggle.textContent = "Group by city";
  toggle.addEventListener("click", () => { state.byCity = !state.byCity; state.focusIndex = -1; renderExplore(); $("#group-toggle").focus(); });
  box.appendChild(toggle);
  for (const r of rows) {
    const g = geo.get(r.key);
    const b = document.createElement("button");
    b.type = "button";
    b.className = `rowlabel ${r.kind}`;
    b.setAttribute("aria-controls", "panel");
    Object.assign(b.style, { top: `${g.y}px`, blockSize: `${g.h}px`, inlineSize: `${L.labelW}px`, fontSize: `${font}px` });
    if (r.kind === "entity") {
      const e = r.entity;
      b.innerHTML = `<span class="rl-name">${esc(e.label)}</span><span class="rl-place ctext city-${e.city}">${esc(e.place ?? "place unknown")}</span>${e.kinds.length ? `<span class="signs">${e.kinds.map(sign).join("")}</span>` : ""}`;
      b.dataset.entity = e.id;
      b.setAttribute("aria-label", `${e.label}, ${e.place ?? "place unknown"}, ${r.count} clippings`);
      b.addEventListener("click", () => openEntity(e.id, b));
    } else if (r.kind === "city") {
      const grp = r.city === "Wien" || r.city === "Berlin" ? r.city : r.city ? "other" : "unknown";
      b.innerHTML = `<span class="sw city-${grp}" aria-hidden="true"></span><span class="rl-name">${esc(r.city || "place unknown")}</span>`;
      b.dataset.city = r.city;
      b.setAttribute("aria-label", `${r.city || "place unknown"}, ${r.count} clippings; show its periodicals`);
      b.addEventListener("click", () => {
        state.filter = { type: "city", key: r.city };
        state.byCity = false;
        state.focusIndex = -1;
        refresh();
        $("#figure .rowlabel")?.focus();
      });
    } else {
      b.innerHTML = `<span class="rl-name">${esc(r.label)}</span>`;
      b.dataset.rest = "1";
      b.setAttribute("aria-label", `${r.label}, ${r.count} clippings`);
      b.addEventListener("click", () => openRest(b));
    }
    box.appendChild(b);
    const cnt = document.createElement("span");
    cnt.className = "rowcount";
    Object.assign(cnt.style, { top: `${g.y + g.h / 2 - font * 0.6}px`, fontSize: `${Math.max(12, font * 0.8)}px` });
    cnt.textContent = r.count;
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
    if (s?.type === "entity") on = on && it.entity === s.id;
    c.classList.toggle("dim", !on);
    c.classList.toggle("sel", s?.type === "item" && s.id === it.pid);
  }
  document.querySelectorAll(".rowlabel").forEach((b) => {
    const on = b.dataset.entity ? expanded({ type: "entity", id: b.dataset.entity }) : expanded({ type: "rest", id: "rest" });
    b.setAttribute("aria-expanded", String(on));
  });
}

function refresh() {
  renderRail();
  if (state.view === "normalise") renderNormalise(); else renderExplore();
}

function setView(view) {
  state.view = view;
  state.focusIndex = -1;
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

// Where focus returns when the panel closes: the same row or control, found again in the view
// that is shown now (the other view's list is hidden but still in the document).
function describe(el) {
  if (!el) return null;
  if (el.id === "chart") return { sel: "#chart" };
  for (const k of ["entity", "item", "cand", "loose", "rest", "city", "key"]) {
    if (el.dataset?.[k]) return { sel: `[data-${k}="${CSS.escape(el.dataset[k])}"]`, rail: el.closest("#rail") !== null };
  }
  if (el.classList?.contains("zoom-btn")) return null;
  return { el };
}

function findAgain(d) {
  if (!d) return null;
  if (d.el) return d.el.isConnected ? d.el : null;
  const root = d.rail ? $("#rail") : d.sel === "#chart" ? document : state.view === "normalise" ? $("#normalise") : $("#figure");
  return root.querySelector(d.sel);
}

function openPanel(sel, html, trigger) {
  closeViewer();
  state.selected = sel;
  if (trigger !== undefined) state.back = describe(trigger);
  const panel = $("#panel");
  panel.innerHTML = `<button type="button" class="back" aria-label="Close the details">${icon("close")}</button>${html}`;
  panel.hidden = false;
  panel.querySelector(".back").addEventListener("click", closePanel);
  panel.querySelectorAll("[data-goto-entity]").forEach((b) => b.addEventListener("click", () => openEntity(b.dataset.gotoEntity)));
  panel.querySelectorAll("[data-goto-item]").forEach((b) => b.addEventListener("click", () => openItem(b.dataset.gotoItem)));
  panel.scrollTop = 0;
  refresh();
  panel.focus();
}

function closePanel() {
  closeViewer();
  state.selected = null;
  $("#panel").hidden = true;
  refresh();
  const target = findAgain(state.back);
  state.back = null;
  (target ?? $("#stage")).focus();
}

const KIND_ICON = { alias: "alias", infer: "infer", split: "split", supplement: "supp", fold: "merge" };
function decision(kind, text) {
  return `<p class="decision">${icon(KIND_ICON[kind] ?? "merge")}<span>${esc(text)}</span></p>`;
}

function openEntity(id, trigger) {
  const e = data.entityById.get(id);
  const items = [...e.items].sort((a, b) => xKey(a) - xKey(b));
  const decisions = new Map();
  for (const it of items) for (const d of it.decisions) decisions.set(d.text, d);
  const folded = e.items.some((it) => it.kinds.has("joined"));
  const also = e.split ? data.entities.filter((x) => x.split && x.label === e.label && x.id !== id) : [];
  openPanel({ type: "entity", id }, `
    <h2>${esc(e.label)}<span class="place ctext city-${e.city}">${esc(e.place ?? "place unknown")}</span></h2>
    <p class="k">${e.forms.length > 1 ? "Catalogue lines joined" : "Catalogue line"}</p>
    <ul class="forms">${e.forms.map(([f, n]) => `<li><code>${esc(f)}</code> <span class="n">${n}</span></li>`).join("")}</ul>
    ${folded ? decision("fold", `Rule: ${data.foldRule}.`) : ""}
    ${[...decisions.values()].map((d) => decision(d.kind, d.text)).join("")}
    ${also.map((s) => `<p class="decision">${icon("split")}<span>The other periodical of this title: <button type="button" class="linkish" data-goto-entity="${esc(s.id)}">${esc(s.label)}, ${esc(s.place)}</button></span></p>`).join("")}
    <p class="k">Clippings, with their facsimiles as evidence</p>
    <div class="thumbs">${items.map((it) => `<button type="button" class="thumb" data-goto-item="${esc(it.pid)}">${it.image ? `<img src="img/${esc(it.pid.replace(":", "_"))}.jpg" alt="" loading="lazy">` : ""}<span>${esc(dateText(it.date))}</span></button>`).join("")}</div>
  `, trigger);
}

function openRest(trigger) {
  const rest = layout.rows.find((r) => r.kind === "rest");
  const list = state.byCity
    ? rest.keys.map((k) => k.slice(5)).map((c) => `<li><button type="button" class="linkish" data-goto-city="${esc(c)}">${esc(c || "place unknown")}</button></li>`)
    : rest.keys.map((id) => data.entityById.get(id)).map((e) => `<li><button type="button" class="linkish" data-goto-entity="${esc(e.id)}">${esc(e.label)}</button> <span class="ctext city-${e.city}">${esc(e.place ?? "place unknown")}</span> <span class="n">${e.items.filter(matches).length}</span></li>`);
  openPanel({ type: "rest", id: "rest" }, `<h2>${esc(rest.label)}</h2><ul class="forms">${list.join("")}</ul>`, trigger);
  $("#panel").querySelectorAll("[data-goto-city]").forEach((b) => b.addEventListener("click", () => {
    state.filter = { type: "city", key: b.dataset.gotoCity };
    state.byCity = false;
    closePanel();
  }));
}

function openCandidate(i, trigger) {
  const c = data.candidates[i];
  const crit = CRITERIA[c.criterion];
  const side = (x) => {
    const e = data.entityById.get(x);
    const its = sideItems(x);
    const thumbs = `<div class="thumbs">${its.map((it) => `<button type="button" class="thumb" data-goto-item="${esc(it.pid)}">${it.image ? `<img src="img/${esc(it.pid.replace(":", "_"))}.jpg" alt="" loading="lazy">` : ""}<span>${esc(e ? dateText(it.date) : it.signature)}</span></button>`).join("")}</div>`;
    if (e) return `<h3><button type="button" class="linkish" data-goto-entity="${esc(e.id)}">${esc(e.label)}</button> <span class="ctext city-${e.city}">${esc(e.place ?? "place unknown")}</span></h3><ul class="forms">${e.forms.map(([f, n]) => `<li><code>${esc(f)}</code> <span class="n">${n}</span></li>`).join("")}</ul>${thumbs}`;
    return `<h3>${esc(its[0].title)}</h3><p><code class="line">${esc(its[0].raw)}</code></p><p class="k">not parsed, ${esc(its[0].signature)}</p>${thumbs}`;
  };
  openPanel({ type: "cand", id: String(i) }, `
    <h2>Possible same periodical</h2>
    <p class="decision">${icon(crit.icon)}<span>${esc(crit.label)}: ${esc(crit.tip)}. Nothing is joined; the question is open for an expert.</span></p>
    ${side(c.a)}
    ${side(c.b)}
  `, trigger);
}

function openLoose(kind, trigger) {
  const c = CASE[kind];
  const its = data.items.filter((it) => it.status === kind);
  openPanel({ type: "loose", id: kind }, `<h2>${esc(c.label)}</h2><p>${esc(c.tip)}.</p>
    <ul class="forms">${its.map((it) => `<li><button type="button" class="linkish" data-goto-item="${esc(it.pid)}">${esc(it.raw || it.title)}</button></li>`).join("")}</ul>`, trigger);
}

function openItem(pid, trigger) {
  const it = data.items.find((x) => x.pid === pid);
  const e = it.entity && data.entityById.get(it.entity);
  const local = it.image ? `img/${pid.replace(":", "_")}.jpg` : "";
  const img = `<figure class="facs">${local ? `<button type="button" class="facs-open" data-zoom="${esc(pid)}" aria-label="Read the facsimile of ${esc(it.signature)}"><img src="${esc(local)}" alt="" loading="lazy"></button>` : ""}
    <button type="button" class="zoom-btn" data-zoom="${esc(pid)}">${icon("zoom")}Read the facsimile</button>
    <figcaption>Facsimile: Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY 4.0</figcaption></figure>`;
  let model;
  if (e) {
    const bits = [it.date && dateText(it.date), it.issue, it.pages && `p. ${it.pages}`].filter(Boolean).map(esc).join(", ");
    model = `<button type="button" class="linkish" data-goto-entity="${esc(e.id)}"><strong>${esc(e.label)}</strong></button>, <span class="ctext city-${e.city}">${esc(e.place ?? "place unknown")}</span>${bits ? `, ${bits}` : ""}`;
  } else {
    model = esc(CASE[it.status].label);
  }
  openPanel({ type: "item", id: pid }, `
    <h2>${esc(it.title)}</h2>
    <p class="k">Catalogue line</p>${it.raw ? `<p><code class="line">${esc(it.raw)}</code></p>` : "<p><em>none</em></p>"}
    <p class="k">Read by rule as</p><p class="model-line">${model}</p>
    ${it.decisions.map((d) => decision(d.kind, d.text)).join("")}
    <p class="k">${esc(it.signature)}</p>
    ${img}
    <p><a class="dh-icon-link" href="${GAMS}${esc(pid)}">Facsimile in Stefan Zweig Digital ${icon("ext")}</a></p>
  `, trigger);
  $("#panel").querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () =>
    openViewer({ pid, localSrc: local, label: it.signature, returnTo: b })));
}

function describeMark(it) {
  const e = data.entityById.get(it.entity);
  return `${it.raw}. ${e.label}, ${e.place ?? "place unknown"}, ${dateText(it.date)}.`;
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
  return data.items.filter((it) => layout.rowOf(it) && matches(it))
    .sort((a, b) => (idx.get(layout.rowOf(a)) - idx.get(layout.rowOf(b))) || (xKey(a) - xKey(b)));
}

// Arrow keys on the figure: left and right move along a row, up and down to the neighbouring row.
function stepFocus(list, key) {
  const cur = list[state.focusIndex];
  if (state.focusIndex < 0 || !cur) return 0;
  if (key === "ArrowRight") return Math.min(list.length - 1, state.focusIndex + 1);
  if (key === "ArrowLeft") return Math.max(0, state.focusIndex - 1);
  const rows = layout.rows.map((r) => r.key);
  const r = rows.indexOf(layout.rowOf(cur));
  const target = rows[r + (key === "ArrowDown" ? 1 : -1)];
  const i = list.findIndex((it) => layout.rowOf(it) === target);
  return i < 0 ? state.focusIndex : i;
}

function popoverFallback() {
  // Browsers without the popover attribute show such elements inline; hide them and toggle on click.
  if (Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover")) return;
  document.querySelectorAll("[popover]").forEach((p) => { p.hidden = true; p.classList.add("no-popover"); });
  document.querySelectorAll("[popovertarget]").forEach((b) => b.addEventListener("click", () => {
    const p = document.getElementById(b.getAttribute("popovertarget"));
    const hide = b.getAttribute("popovertargetaction") === "hide" || !p.hidden;
    document.querySelectorAll(".no-popover").forEach((x) => { x.hidden = true; });
    p.hidden = hide;
  }));
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
    const list = orderedItems();
    if (!list.length) return;
    if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(ev.key)) {
      state.focusIndex = stepFocus(list, ev.key);
      dotEls.forEach((c) => c.classList.remove("kfocus"));
      const it = list[state.focusIndex];
      dotEls.get(it.pid)?.classList.add("kfocus");
      showTip(it, layout.pos.get(it.pid));
      $("#live").textContent = describeMark(it);
      ev.preventDefault();
    } else if ((ev.key === "Enter" || ev.key === " ") && list[state.focusIndex]) {
      openItem(list[state.focusIndex].pid, svg);
      ev.preventDefault();
    }
  });
  svg.addEventListener("blur", () => { $("#tip").hidden = true; dotEls.forEach((c) => c.classList.remove("kfocus")); });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || document.querySelector(".about:popover-open")) return;
    // The viewer closes first and gives focus back to its button; a second Escape closes the panel.
    if (isOpen()) { closeViewer(); return; }
    if (!$("#panel").hidden) closePanel();
  });
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (state.view === "explore") renderExplore(); }, 120); });
}

async function main() {
  popoverFallback();
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
  wireViewer();
  // The address carries the view, so a link or a reload opens Explore directly.
  setView(location.hash === "#explore" ? "explore" : "normalise");
}

main();
