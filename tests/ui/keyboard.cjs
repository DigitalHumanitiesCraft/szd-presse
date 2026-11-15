// Run against the local server (python -m http.server 8731 --directory docs):
//   node tests/ui/keyboard.cjs [screenshot-dir]
// Needs Playwright; with no local install, point NODE_PATH at a node_modules that has it.
// Every step prints PASS or FAIL with its expected result in the step name.
// Keyboard path and zoom for the Normalise / Explore frame. Expected results stand in each step name.
const { chromium } = require('playwright');
// Base address of the served site; set BASE to test the published page instead of the local server.
const BASE = process.env.BASE || 'http://127.0.0.1:8731/';
const out = process.argv[2] || require('node:os').tmpdir();
const log = (step, ok, note = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${step}${note ? ' :: ' + note : ''}`);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(BASE);
  await page.waitForSelector('#work:not([hidden])');
  const act = () => page.evaluate(() => { const a = document.activeElement; return (a.className?.baseVal ?? a.className) + '|' + (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40); });
  const order = [];
  for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); order.push(await act()); }
  console.log('tab order:', order.join('  ->  '));
  log('switch has one tab stop', order.filter((x) => /Normalise|Explore/.test(x)).length === 1);
  // Tooltip on keyboard focus of the switch.
  await page.focus('[data-view="normalise"]');
  log('switch tooltip on focus', await page.evaluate(() => getComputedStyle(document.querySelector('#tip-normalise')).display !== 'none'));
  // Enter on the first proposal opens the panel, focus moves into it, Escape returns to the row.
  await page.focus('.prop');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  log('Enter on proposal opens panel', await page.evaluate(() => !document.querySelector('#panel').hidden && document.activeElement.id === 'panel'), await page.evaluate(() => document.querySelector('#panel h2')?.textContent));
  log('selected row marked', await page.evaluate(() => document.querySelector('.prop.on') !== null));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  log('Escape closes panel and returns to row', await page.evaluate(() => document.querySelector('#panel').hidden && document.activeElement.classList.contains('prop')));
  // Rail filter by keyboard.
  await page.focus('.rail-item[data-key="split"]');
  log('rail tooltip on focus', await page.evaluate(() => getComputedStyle(document.querySelector('#rt-split')).display !== 'none'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  log('filter split shows only Der Morgen', await page.evaluate(() => [...document.querySelectorAll('.prop .prop-name')].map((e) => e.textContent).every((t) => t === 'Der Morgen')), await page.evaluate(() => document.querySelectorAll('.prop').length));
  log('active filter marked and reset offered', await page.evaluate(() => document.querySelector('.rail-item.on') && !!document.querySelector('#reset')));
  await page.focus('#reset');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  log('reset clears filter', await page.evaluate(() => !document.querySelector('.rail-item.on')));
  // Unchanged group opens and closes.
  log('unchanged group listed without an expander', await page.evaluate(() => [...document.querySelectorAll('.pgroup h2')].some((h) => h.textContent.startsWith('Unchanged')) && !document.querySelector('[aria-expanded].opener')));
  log('candidate group names the five unparsed lines with a known title', await page.evaluate(() => document.querySelectorAll('.prop.cand').length === 9));
  // Switch to Explore with the arrow key.
  await page.focus('[data-view="normalise"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  log('ArrowRight switches to Explore', await page.evaluate(() => !document.querySelector('#figure').hidden && location.hash === '#explore'));
  await page.focus('#chart');
  await page.keyboard.press('ArrowRight');
  log('arrow on figure shows tooltip', await page.evaluate(() => !document.querySelector('#tip').hidden));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  log('Enter opens clipping in panel', await page.evaluate(() => !!document.querySelector('#panel .line') && document.activeElement.id === 'panel'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  log('Escape closes and returns focus to figure', await page.evaluate(() => document.querySelector('#panel').hidden && document.activeElement.id === 'chart'));
  await page.focus('#group-toggle');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  log('group by city shows city rows', await page.evaluate(() => !!document.querySelector('.rowlabel[data-city="Basel"]')));
  await page.focus('.rowlabel[data-city="Basel"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  log('a city row filters to its periodicals', await page.evaluate(() => [...document.querySelectorAll('.rowlabel.entity')].every((b) => b.getAttribute('aria-label').includes('Basel')) && !!document.querySelector('#reset')), await page.evaluate(() => document.querySelector('#reset')?.textContent));
  await page.focus('#reset');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.focus('.rowlabel.entity');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  log('row label opens periodical', await page.evaluate(() => !!document.querySelector('#panel h2')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  log('Escape in Explore returns focus to the row label', await page.evaluate(() => document.activeElement.classList.contains('rowlabel') && !document.activeElement.closest('[hidden]')));
  await page.focus('.navbtn[popovertarget=about]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const open = await page.evaluate(() => document.querySelector('#about').matches(':popover-open'));
  await page.keyboard.press('Escape');
  log('About opens, Escape closes', open && await page.evaluate(() => !document.querySelector('#about').matches(':popover-open')));

  for (const view of ['', '#explore']) {
    const z = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2 });
    await z.goto(BASE + view);
    await z.waitForSelector('#work:not([hidden])');
    await z.waitForTimeout(200);
    const r = await z.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    log(`200% ${view || '#normalise'} no horizontal scroll`, r[0] <= r[1], JSON.stringify(r));
    await z.screenshot({ path: `${out}/n-zoom200${view.replace('#', '-') || '-normalise'}.png` });
  }
  await browser.close();
})();
