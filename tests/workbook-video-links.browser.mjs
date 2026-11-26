// node tests/workbook-video-links.browser.mjs <app-base-url>
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HOME + '/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.argv[2] || 'http://127.0.0.1:4199/';
const output = '/tmp/mo65-videolinks';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, acceptDownloads: true });
  // Verify the destination of real taps without starting YouTube playback or sending viewing activity.
  await context.route('https://youtu.be/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Erklärvideo-Link geprüft</title>' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + 'index.html?view=workbooks');
  await page.getByRole('link', { name: 'PDF öffnen', exact: true }).click();
  const ready = number => page.waitForFunction(n => document.querySelector('#reader-canvas')?.getAttribute('aria-label') === `Seite ${n} von 57` && !document.querySelector('#reader-status').textContent, number);
  await ready(1);
  for (const [number, urls] of [
    [6, ['https://youtu.be/iKPQYEVlyZU']],
    [7, ['https://youtu.be/ssXjpy-Hrz0', 'https://youtu.be/wbGuqWN3L70']],
    [8, ['https://youtu.be/IDr7RZPKJCo', 'https://youtu.be/Hhxy4ovi6Mk']],
    [9, ['https://youtu.be/L-DDQhbrxdQ']]
  ]) {
    await page.getByRole('spinbutton', { name: 'Seitennummer' }).fill(String(number));
    await page.getByRole('spinbutton', { name: 'Seitennummer' }).press('Enter');
    await ready(number);
    assert.equal(await page.locator('#reader-links a[href^="https://youtu.be/"]').count(), urls.length);
    for (const url of urls) {
      const link = page.locator(`#reader-links a[href="${url}"]`);
      const box = await link.boundingBox();
      assert.ok(box.width > 50 && box.height > 75, 'The link must include the full video field on a tablet.');
      for (const fraction of [0.15, 0.72]) {
        const popupPromise = context.waitForEvent('page');
        await link.tap({ position: { x: box.width / 2, y: box.height * fraction } });
        const popup = await popupPromise;
        await popup.waitForURL(url);
        assert.equal(page.url(), base + 'workbook-view.html');
        await popup.close();
      }
    }
    await page.screenshot({ path: `${output}/tablet-seite-${number}.png`, fullPage: true });
    console.log(`Seite ${number}: QR-Code und Beschriftung öffnen jeweils das richtige Video; das Heft bleibt geöffnet.`);
  }
  const pdfRequest = page.waitForRequest(request => request.url().includes('MO65-Arbeitsheft.pdf?v=20260917-video-316'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Herunterladen', exact: true }).click();
  await pdfRequest;
  const download = await downloadPromise;
  await download.saveAs(`${output}/download-geprueft.pdf`);
  assert.deepEqual(await readFile(`${output}/download-geprueft.pdf`), await readFile(new URL('../MO65-Arbeitsheft.pdf', import.meta.url)));
  await page.locator('dialog').waitFor({ state: 'detached' });
  await page.getByRole('link', { name: 'Zurück zur App', exact: true }).click();
  await page.locator('.workbook-actions').waitFor();
  assert.deepEqual(errors, []);
  console.log('Aktuelle PDF einschließlich Videolinks gespeichert; Rückweg zur App erfolgreich.');
} finally {
  await browser.close();
}
