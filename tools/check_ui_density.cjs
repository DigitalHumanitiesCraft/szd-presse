'use strict';
// Density check of a rendered interface (Human User, 11 November 2026: "viel zu viele Strukturen, viel zu viele
// Felder, Untertitel, Überschriften, viel zu viele Ebenen … Wie können wir das lösen, dass diese User Interfaces
// nicht mehr erzeugt werden?"). It measures each page at a wide and a narrow viewport in the first screen, the part a
// person sees before scrolling, and fails when a measure exceeds its limit:
//   headings and heading levels, distinct text styles (size, weight, colour), text elements and words, boxes
//   (bordered or filled surfaces) and how deep they nest, the distance from the top of the page to the first text of
//   the main content, and form controls.
// The limits come from pages the Human User approved and rejected (repository pruefansicht, knowledge/design.md,
// Density limits). The script is one file without project dependencies, so other repositories copy it unchanged; it
// needs Playwright, found through NODE_PATH, and an installed Chrome (or --channel).
// It merges the measure written for the regesten edition the same day (measure_ui.py): the browser's own visibility
// test, visually hidden text and a resting pointer come from there.
//
// Usage:
//   node check_ui_density.cjs <url> [<url> …]   measure and fail on a breach (exit 1)
//   node check_ui_density.cjs --report <url> …   print the measures without failing
//   node check_ui_density.cjs --self-test         an overloaded fixture must fail and a calm one pass
// Options: --profile work|page (default work); --viewport wide|narrow (default both); --json for one JSON line per
// page and viewport; --limits <json file> with {wide, narrow} to override; --channel <browser channel> (default
// chrome); --wait <ms>. Exit code 0 when every page is within its limits, 1 on a breach, 2 on an error.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const VIEWPORTS = [{ name: 'wide', width: 1280, height: 800 }, { name: 'narrow', width: 360, height: 740 }];
// Two profiles. "work" is a working surface such as a dashboard or a data view; its limits sit at the largest value
// the approved working surfaces reach (the dashboard, Koordination prüfen, the Regesten view "Zeit und Netz"), and
// every rejected page breaches at least one of headings, heading levels or text styles. "page" is an entry or
// explanation page (a start page, an about page); its limits follow the rule Research Coordination set for it on
// 11 November 2026: one title, body text and one quiet line, at most two heading levels, one select, no box in a box.
// knowledge/design.md, Density limits, holds the measures behind them.
const LIMITS = {
  work: {
    wide: { headings: 4, headingLevels: 2, textStyles: 12, textElements: 70, words: 260, boxes: 8, boxDepth: 1, mainTop: 160, controls: 45, selects: 2 },
    narrow: { headings: 3, headingLevels: 2, textStyles: 10, textElements: 35, words: 110, boxes: 6, boxDepth: 1, mainTop: 180, controls: 15, selects: 2 },
  },
  page: {
    wide: { headings: 3, headingLevels: 2, textStyles: 3, textElements: 20, words: 120, boxes: 2, boxDepth: 0, mainTop: 200, controls: 6, selects: 1 },
    narrow: { headings: 2, headingLevels: 2, textStyles: 3, textElements: 14, words: 80, boxes: 1, boxDepth: 0, mainTop: 220, controls: 5, selects: 1 },
  },
};

// Runs inside the page: the measures of the first screen.
function measure() {
  const H = innerHeight;
  const W = innerWidth;
  // Visible in the first screen: inside the viewport and inside every ancestor that clips its content (a scroll
  // area or a hidden overflow), so the hidden part of a long list or a wide figure does not count.
  const visible = (n) => {
    const r = n.getBoundingClientRect();
    let top = Math.max(r.top, 0), bottom = Math.min(r.bottom, H), left = Math.max(r.left, 0), right = Math.min(r.right, W);
    // A box of one pixel or less is the usual visually hidden text for screen readers.
    if (r.width <= 1 || r.height <= 1 || bottom <= top || right <= left) return false;
    // Chromium keeps layout boxes for content it does not paint (closed disclosures, content-visibility); the
    // browser's own visibility test settles those first (from the regesten measure of the same day).
    if (n.checkVisibility && !n.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) return false;
    for (let e = n; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      if (e.classList.contains('sr-only') || e.classList.contains('visually-hidden')) return false;
      // The content of a closed disclosure is not on screen; only its summary is.
      if (e.tagName === 'DETAILS' && !e.open && !e.querySelector(':scope > summary')?.contains(n)) return false;
      if (e !== n && (s.overflowX !== 'visible' || s.overflowY !== 'visible')) {
        const c = e.getBoundingClientRect();
        top = Math.max(top, c.top); bottom = Math.min(bottom, c.bottom); left = Math.max(left, c.left); right = Math.min(right, c.right);
        if (bottom <= top || right <= left) return false;
      }
    }
    return true;
  };
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')].filter(visible);
  const levels = new Set(headings.map((h) => (/^H\d$/.test(h.tagName) ? h.tagName : 'aria-' + (h.getAttribute('aria-level') || '2'))));
  // Text: elements that carry their own visible text in the first screen.
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let words = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'TITLE'].includes(el.tagName)) continue;
    if (!visible(el)) continue;
    words += text.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    if (!seen.has(el)) { seen.add(el); texts.push(el); }
  }
  // A link keeps the style of the text around it: its colour marks an action and is no style of its own.
  const styleOf = (el) => {
    const s = getComputedStyle(el);
    const link = el.closest('a');
    const color = link && link.parentElement ? getComputedStyle(link.parentElement).color : s.color;
    return [Math.round(parseFloat(s.fontSize)), s.fontWeight >= 600 ? 'bold' : 'normal', color].join('|');
  };
  const styleSamples = new Map();
  for (const el of texts) { const key = styleOf(el); if (!styleSamples.has(key)) styleSamples.set(key, el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)); }
  const styles = new Set(styleSamples.keys());
  // Boxes: surfaces with a border on at least three sides or a background unlike the one behind them.
  const background = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
  const isBox = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 24) return false;
    // Controls are no surfaces, a link drawn as a button included.
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY', 'A', 'IMG', 'SVG', 'svg', 'HR'].includes(el.tagName)) return false;
    const s = getComputedStyle(el);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none').length;
    const own = s.backgroundColor;
    const filled = !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(own) && own !== background(el.parentElement || document.body);
    return sides >= 3 || filled || parseFloat(s.boxShadow === 'none' ? 0 : 1) > 0 && sides >= 1;
  };
  const boxes = [...document.querySelectorAll('body *')].filter((el) => visible(el) && isBox(el));
  const boxSet = new Set(boxes);
  let depth = 0;
  for (const box of boxes) {
    let d = 0;
    for (let e = box.parentElement; e; e = e.parentElement) if (boxSet.has(e)) d += 1;
    depth = Math.max(depth, d);
  }
  // The first text of the main content, measured from the top of the page.
  const main = document.querySelector('main, [role="main"]') || document.body;
  const firstText = [...main.querySelectorAll('*')].find((el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.sr-only'));
  const mainTop = firstText ? Math.round(firstText.getBoundingClientRect().top + scrollY) : 0;
  const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button, summary')].filter(visible).length;
  const selects = [...document.querySelectorAll('select')].filter(visible).length;
  // samples is no measure: one text per style and each box, printed with --report so a breach can be traced.
  const boxName = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  return {
    measures: { headings: headings.length, headingLevels: levels.size, textStyles: styles.size, textElements: texts.length, words, boxes: boxes.length, boxDepth: boxes.length ? depth : 0, mainTop, controls, selects },
    samples: [...[...styleSamples].map(([key, text]) => `style ${key}  "${text}"`), ...boxes.map((b) => 'box   ' + boxName(b))],
  };
}

async function measurePage(browser, url, viewport, wait) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: 'light' });
  const page = await context.newPage();
  // A measurement only reads; nothing it loads may write.
  await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort()));
  // An error page is calm and would pass; a page that does not load is an error of the run, never a measure.
  const response = await page.goto(url, { waitUntil: 'load' });
  if (response && !response.ok()) throw new Error(`HTTP ${response.status()} for ${url}; nothing measured`);
  await page.waitForTimeout(wait);
  // No hover state may count: the pointer rests in the corner.
  await page.mouse.move(1, 1);
  const result = await page.evaluate(measure);
  await context.close();
  return result;
}

function breaches(result, limits) {
  return Object.entries(limits).filter(([key, max]) => result[key] > max).map(([key, max]) => `${key} ${result[key]} > ${max}`);
}

async function run(urls, { limits = LIMITS.work, report = false, channel = 'chrome', wait = 1500, viewports = VIEWPORTS, json = false } = {}) {
  const browser = await chromium.launch({ channel });
  let failed = false;
  try {
    for (const url of urls) {
      for (const viewport of viewports) {
        const { measures, samples } = await measurePage(browser, url, viewport, wait);
        const over = breaches(measures, limits[viewport.name]);
        if (over.length && !report) failed = true;
        if (json) { console.log(JSON.stringify({ url, viewport: viewport.name, ...measures, over })); continue; }
        console.log(`${over.length ? (report ? 'over' : 'FAIL') : 'ok  '} ${viewport.name.padEnd(6)} ${url}`);
        console.log('     ' + Object.entries(measures).map(([k, v]) => `${k} ${v}`).join(', ') + (over.length ? '\n     over: ' + over.join('; ') : ''));
        if (report) console.log(samples.map((s) => '       ' + s).join('\n'));
      }
    }
  } finally {
    await browser.close();
  }
  return !failed;
}

// Two fixtures: a calm page with one title, one sentence, one figure and one way on; and the overloaded page the
// Human User rejected, rebuilt in miniature: three heading levels, grey meta lines under every element, two
// selects, a box inside a box.
const CALM = `<!doctype html><html lang="en"><body style="font:16px sans-serif;margin:0;padding:16px">
<main><h1>Research Mission Control</h1><p>A method for directing AI agents through a research project, step by step.</p>
<figure style="margin:24px 0"><p>Step 1 of 4: the reviewer compares the worksheet with the rule.</p><button>Next step</button></figure>
<p><a href="#use">Use it in your project</a></p></main></body></html>`;
const LOUD = `<!doctype html><html lang="en"><body style="font:16px sans-serif;margin:0;padding:16px">
<header style="height:240px;border-bottom:1px solid #999"><h1>Title</h1><p style="color:#666;font-size:13px">Subtitle line</p></header>
<main><h2>Section</h2><p style="color:#666;font-size:12px">Meta line with <a href="#">a link</a></p><select><option>One</option></select><button>Earlier</button><button>Continue</button><button>Begin again</button>
<div style="border:1px solid #ccc;padding:8px;background:#f4f0ff"><h3>Rule</h3><p style="color:#666;font-size:12px">Meta</p><div style="border:1px solid #aaa;padding:8px;background:#fff"><h4>Inner</h4><select><option>Other</option></select><p style="font-weight:700">Bold lead</p><p style="font-size:20px">Quote</p></div></div>
${Array.from({ length: 30 }, (_, i) => `<p style="color:#${i % 2 ? '444' : '777'};font-size:${12 + (i % 5)}px">Element ${i} with several words to read on the first screen</p>`).join('')}
</main></body></html>`;

async function selfTest(options) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-density-'));
  const calm = path.join(dir, 'calm.html');
  const loud = path.join(dir, 'loud.html');
  fs.writeFileSync(calm, CALM);
  fs.writeFileSync(loud, LOUD);
  // The fixtures are entry pages, so the page profile judges them; the overloaded one breaches the work profile too.
  const calmOk = await run([pathToFileURL(calm).href], { ...options, limits: LIMITS.page, wait: 100 });
  const loudOk = await run([pathToFileURL(loud).href], { ...options, limits: LIMITS.page, wait: 100 });
  const loudWorkOk = await run([pathToFileURL(loud).href], { ...options, limits: LIMITS.work, wait: 100 });
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = calmOk && !loudOk && !loudWorkOk;
  console.log(ok ? 'self-test ok: the calm page passes, the overloaded page fails under both profiles' : 'self-test FAILED');
  return ok;
}

(async () => {
  const args = process.argv.slice(2);
  const option = (name) => { const i = args.indexOf(name); if (i < 0) return null; const value = args[i + 1]; args.splice(i, 2); return value; };
  const limitsFile = option('--limits');
  const profile = option('--profile') || 'work';
  if (!LIMITS[profile] && !limitsFile) throw new Error('Unknown profile ' + profile + '; use work or page');
  const channel = option('--channel') || 'chrome';
  const wait = Number(option('--wait') || 1500);
  const report = args.includes('--report');
  const json = args.includes('--json');
  const only = option('--viewport');
  const viewports = only ? VIEWPORTS.filter((v) => v.name === only) : VIEWPORTS;
  if (!viewports.length) throw new Error('Unknown viewport ' + only + '; use wide or narrow');
  const self = args.includes('--self-test');
  const urls = args.filter((a) => !a.startsWith('--'));
  const limits = limitsFile ? JSON.parse(fs.readFileSync(limitsFile, 'utf8')) : LIMITS[profile];
  const ok = self ? await selfTest({ channel }) : await run(urls, { limits, report, channel, wait, viewports, json });
  process.exitCode = ok ? 0 : 1;
})().catch((error) => { console.error(error); process.exitCode = 2; });

module.exports = { LIMITS, measure };
