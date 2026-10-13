// a11y-check.mjs — opens the site in a headless browser and runs the WCAG 2.2 A/AA
// rules from axe-core on the page and on each animation. Exits with 1 if anything fails.
// Run: npm install && npx playwright install chromium && npm run check
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AXE = readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const page = pathToFileURL(path.join(root, 'index.html')).href;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
let failed = 0;

async function audit(label, context) {
  await p.addScriptTag({ content: AXE });
  const found = await p.evaluate(async ([ctx, tags]) => {
    const r = await axe.run(ctx || document, { runOnly: { type: 'tag', values: tags } });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
  }, [context, TAGS]);
  console.log(`${found.length ? '✗' : '✓'} ${label}`);
  found.forEach((f) => console.log('   ' + f));
  failed += found.length;
}

await p.goto(page);
await p.waitForTimeout(1000);
await audit('Dashboard');
// the animations sit behind the Watch and share toggle
if (await p.getAttribute('#watch-toggle', 'aria-expanded') !== 'true') await p.click('#watch-toggle');
await audit('Watch and share, open');
for (const [sel, label] of [['[data-recap="latest"]', 'Race recap'], ['[data-film="grid"]', 'Grid race'], ['[data-film="tour"]', 'World tour']]) {
  await p.click(sel);
  await p.waitForTimeout(500);
  await audit(label, '#film');
  await p.keyboard.press('Escape');
}
await p.click('a.tl-film[data-view="snapshot"]');
await p.waitForTimeout(300);
await audit('Race snapshot');
await p.click('#snapshot a[data-view="dashboard"]');
await p.click('a[data-view="accessibility"]');
await p.waitForTimeout(200);
await audit('Accessibility statement');

// WCAG 2.4.11: keyboard focus must never sit under the pinned season bar
await p.goto(page);
await p.waitForTimeout(1000);
let hidden = 0;
for (let i = 0; i < 80; i++) {
  await p.keyboard.press('Tab');
  hidden += await p.evaluate(() => {
    const e = document.activeElement, bar = document.getElementById('round-controls');
    if (!e || e === document.body || !bar || !bar.classList.contains('is-stuck') || bar.contains(e)) return 0;
    const a = e.getBoundingClientRect(), b = bar.getBoundingClientRect();
    return a.top < b.bottom && a.bottom > b.top ? 1 : 0;
  });
}
console.log(`${hidden ? '✗' : '✓'} Focus never hidden under the season bar`);
failed += hidden;

if (errors.length) { console.log('✗ Script errors:\n   ' + errors.join('\n   ')); failed += errors.length; }
await browser.close();
process.exit(failed ? 1 : 0);
