// Run against the local server: node tests/ui/viewer.cjs [screenshot-dir]. Needs Playwright and,
// for the online part, network access to gams.uni-graz.at; the offline part blocks it on purpose.
// Viewer checks: online through GAMS IIIF, offline with GAMS blocked, keyboard and focus.
const { chromium } = require('playwright');
// Base address of the served site; set BASE to test the published page instead of the local server.
const BASE = process.env.BASE || 'http://127.0.0.1:8731/';
const out = process.argv[2] || require('node:os').tmpdir();
const log = (s, ok, n = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${s}${n ? ' :: ' + n : ''}`);
async function openFz(p) {
  await p.goto(BASE);
  await p.waitForSelector('#work:not([hidden])');
  await p.click('.prop[data-entity^="frankfurter zeitung|"]');
  await p.click('.thumb >> nth=1');
  await p.waitForSelector('.zoom-btn');
}
(async () => {
  const b = await browser();
  async function browser() { return chromium.launch(); }
  // Online
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await openFz(p);
  await p.focus('.zoom-btn');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('#v-placeholder').hidden === true, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ open: !document.querySelector('#viewer').hidden, ph: document.querySelector('#v-placeholder').hidden, page: document.querySelector('#v-page').textContent, focus: document.activeElement.id, panelLine: !!document.querySelector('#panel .line'), credit: document.querySelector('#v-credit').textContent }));
  log('viewer opens, IIIF loaded, placeholder gone', st.open && st.ph, JSON.stringify(st));
  log('catalogue line stays visible beside the image', st.panelLine);
  await p.click('#v-in'); await p.click('#v-in');
  await p.waitForTimeout(1500);
  await p.mouse.move(5, 715);
  await p.screenshot({ path: `${out}/viewer-1280.png` });
  if (st.page) { await p.click('#v-next'); await p.waitForTimeout(800); log('next page', (await p.textContent('#v-page')).startsWith('Page 2'), await p.textContent('#v-page')); }
  const tabs = [];
  await p.focus('#v-close');
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Shift+Tab'); tabs.push(await p.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.id)); }
  console.log('toolbar by keyboard:', tabs.join(' <- '));
  await p.keyboard.press('Escape');
  log('Escape closes viewer, focus back on zoom button', await p.evaluate(() => document.querySelector('#viewer').hidden && document.activeElement.classList.contains('zoom-btn')));
  log('page did not scroll', await p.evaluate(() => scrollY === 0));
  console.log('page errors', errs.length, errs.slice(0, 2));
  // Offline: GAMS blocked
  const q = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await q.route('https://gams.uni-graz.at/**', (r) => r.abort());
  await openFz(q);
  await q.click('.zoom-btn');
  await q.waitForTimeout(2500);
  const off = await q.evaluate(() => ({ note: document.querySelector('#v-note').hidden ? '' : document.querySelector('#v-note').textContent, ph: document.querySelector('#v-placeholder').hidden }));
  log('offline: local image shown with a note', !!off.note, JSON.stringify(off));
  await q.screenshot({ path: `${out}/viewer-offline.png` });
  await b.close();
})();
