// Deep-zoom viewer for one clipping. Pages come from the IIIF manifest and Image API of GAMS
// (https://gams.uni-graz.at/{pid}/sdef:IIIF/getManifest, CORS open, checked 2026-11-15). The
// reduced local image stands in while the archive loads and remains when it cannot be reached.
// Deliberate choice: the public page loads the archive's images at view time instead of serving
// local tiles; the alternative and its cost are recorded in knowledge/data.md.
"use strict";

const OSD_SRC = "vendor/openseadragon/openseadragon.min.js";
const CREDIT = "Literaturarchiv Salzburg, Stefan Zweig Digital, CC BY 4.0";
let osdReady;
let viewer;
let pages = [];
let page = 0;
let onClose = null;

function loadOsd() {
  osdReady ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = OSD_SRC;
    s.onload = () => resolve(window.OpenSeadragon);
    s.onerror = () => reject(new Error("viewer script"));
    document.head.appendChild(s);
  });
  return osdReady;
}

async function manifestPages(pid) {
  const res = await fetch(`https://gams.uni-graz.at/${pid}/sdef:IIIF/getManifest`);
  if (!res.ok) throw new Error(String(res.status));
  const m = await res.json();
  return m.sequences[0].canvases.map((c) => `${c.images[0].resource.service["@id"]}/info.json`);
}

// GAMS answers info.json without "tiles" and with an empty "sizes" list, which OpenSeadragon cannot
// open. The service declares IIIF Image API level 2 (arbitrary regions and sizes), so a tile grid
// is added here instead of being guessed by the viewer.
async function tileSource(url) {
  if (typeof url !== "string") return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const info = await res.json();
  if (!info.tiles?.length) info.tiles = [{ width: 512, scaleFactors: [1, 2, 4, 8, 16, 32] }];
  if (Array.isArray(info.sizes) && !info.sizes.length) delete info.sizes;
  return info;
}

function el(id) { return document.getElementById(id); }

function showPage() {
  el("v-page").textContent = pages.length > 1 ? `Page ${page + 1} of ${pages.length}` : "";
  el("v-prev").disabled = page <= 0;
  el("v-next").disabled = page >= pages.length - 1;
  el("v-prev").hidden = el("v-next").hidden = pages.length < 2;
  const wanted = page;
  tileSource(pages[page]).then((src) => { if (wanted === page) viewer.open(src); })
    .catch(() => { if (pages[page]?.type !== "image") fallback(el("v-placeholder").src); });
}

function fallback(localSrc, OSD) {
  pages = [{ type: "image", url: localSrc }];
  page = 0;
  el("v-note").textContent = "The archive's full-resolution images could not be reached; showing the reduced first page.";
  el("v-note").hidden = false;
  if (viewer) showPage();
  else if (OSD) { viewer = make(OSD); showPage(); }
}

function make(OSD) {
  const v = OSD({
    element: el("v-osd"),
    prefixUrl: "vendor/openseadragon/images/",
    showNavigationControl: false,
    crossOriginPolicy: "Anonymous",
    gestureSettingsMouse: { clickToZoom: false },
    visibilityRatio: 0.8,
    minZoomImageRatio: 0.6,
  });
  v.addHandler("open", () => { el("v-placeholder").hidden = true; });
  v.addHandler("open-failed", () => {
    if (pages[page]?.type !== "image") fallback(el("v-placeholder").src);
  });
  return v;
}

export async function openViewer({ pid, localSrc, label, returnTo }) {
  onClose = returnTo;
  const box = el("viewer");
  box.hidden = false;
  document.getElementById("app").classList.add("viewing");
  el("v-note").hidden = true;
  const ph = el("v-placeholder");
  ph.hidden = !localSrc;
  if (localSrc) { ph.src = localSrc; ph.alt = `Reduced first page of ${label}`; }
  el("v-credit").innerHTML = `${CREDIT}, <a href="https://gams.uni-graz.at/${pid}">object in GAMS</a>`;
  el("v-osd").setAttribute("aria-label", `Facsimile of ${label}. Arrow keys pan, plus and minus zoom.`);
  el("v-close").focus();
  let OSD;
  try {
    OSD = await loadOsd();
  } catch {
    el("v-note").textContent = "The viewer could not be loaded; the reduced first page is shown.";
    el("v-note").hidden = false;
    return;
  }
  viewer ??= make(OSD);
  try {
    pages = await manifestPages(pid);
    page = 0;
    el("v-note").hidden = true;
    showPage();
  } catch {
    if (localSrc) fallback(localSrc, OSD);
    else { el("v-note").textContent = "The archive's images could not be reached."; el("v-note").hidden = false; }
  }
}

export function closeViewer() {
  if (el("viewer").hidden) return false;
  el("viewer").hidden = true;
  document.getElementById("app").classList.remove("viewing");
  viewer?.close();
  const back = onClose;
  onClose = null;
  if (back?.isConnected) back.focus();
  return true;
}

export function isOpen() { return !el("viewer").hidden; }

export function wireViewer() {
  el("v-prev").addEventListener("click", () => { if (page > 0) { page -= 1; showPage(); } });
  el("v-next").addEventListener("click", () => { if (page < pages.length - 1) { page += 1; showPage(); } });
  el("v-in").addEventListener("click", () => viewer?.viewport.zoomBy(1.5));
  el("v-out").addEventListener("click", () => viewer?.viewport.zoomBy(1 / 1.5));
  el("v-home").addEventListener("click", () => viewer?.viewport.goHome());
  el("v-close").addEventListener("click", closeViewer);
}
