import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
assert.ok(modulePath, 'PLAYWRIGHT_MODULE_PATH must point to the isolated Playwright install.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const baseUrl = process.env.AETHERFORGE_URL || 'http://127.0.0.1:4545/';
const screenshotDir = process.env.AETHERFORGE_SCREENSHOT_DIR || '.aetherforge-visual-qa';
await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') pageErrors.push(message.text());
});

try {
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'Workbench document should load over the local adapter.');
  assert.equal(await page.title(), 'ÆtherForge · Engineering Workbench');
  await page.waitForFunction(() => document.querySelector('#connectionBadge')?.textContent.includes('CONNECTED'));
  assert.equal(await page.locator('#main h1').innerText(), 'Overview');
  await page.screenshot({ path: `${screenshotDir}/desktop-overview.png`, fullPage: true });

  const pages = [
    ['modules', 'Module Library'],
    ['studio', 'Workflow Studio'],
    ['evidence', 'Evidence Center'],
    ['sustainability', 'Sustainability Lab'],
    ['assets', 'Asset Studio'],
    ['assistant', 'Engineering Guide'],
    ['settings', 'Settings & About']
  ];
  for (const [id, title] of pages) {
    await page.locator(`.sidebar button[data-page="${id}"]`).click();
    assert.equal(await page.locator('#main h1').innerText(), title, `${title} should render from navigation.`);
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(widths.document <= widths.viewport + 1, `${title} has horizontal overflow: ${JSON.stringify(widths)}`);
  }

  await page.locator('.sidebar button[data-page="modules"]').click();
  const beforeFilter = await page.locator('#moduleList .module-row').count();
  await page.locator('#moduleSearch').fill('Authentication');
  const afterFilter = await page.locator('#moduleList .module-row').count();
  assert.ok(afterFilter > 0 && afterFilter < beforeFilter, 'Module search should narrow the maintained catalog.');

  await page.locator('.sidebar button[data-page="studio"]').click();
  await page.screenshot({ path: `${screenshotDir}/desktop-studio.png`, fullPage: true });
  await page.locator('[data-preset-action="brush"][data-preset="precision"]').click();
  assert.equal(await page.locator('#brushSize').inputValue(), '48', 'Workflow preset should populate the configured value.');
  await page.locator('[data-workflow-run="brush"]').click();
  await page.waitForFunction(() => document.querySelector('#workflowState')?.textContent.includes('completed'));
  const output = await page.locator('#workflowOutput').textContent();
  assert.doesNotThrow(() => JSON.parse(output), 'Workflow Studio should render the maintained JSON result.');
  await page.locator('[data-result-tab="constraints"]').click();
  assert.match(await page.locator('#workflowInspectorPane').innerText(), /BLOCKED/);

  await page.locator('#themeButton').click();
  assert.equal(await page.locator('body').evaluate(el => el.classList.contains('light')), true, 'Theme toggle should activate light mode.');
  await page.locator('#themeButton').click();

  for (const viewport of [
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.locator('.sidebar button[data-page="overview"]').click();
    assert.equal(await page.locator('.mobile-nav').isVisible(), true, `${viewport.name} navigation should be available.`);
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(widths.document <= widths.viewport + 1, `${viewport.name} overview has horizontal overflow: ${JSON.stringify(widths)}`);
    await page.screenshot({ path: `${screenshotDir}/${viewport.name}-overview.png`, fullPage: true });
    await page.locator('.mobile-nav button[data-page="studio"]').click();
    assert.equal(await page.locator('#main h1').innerText(), 'Workflow Studio');
    const studioWidths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(studioWidths.document <= studioWidths.viewport + 1, `${viewport.name} studio has horizontal overflow: ${JSON.stringify(studioWidths)}`);
    await page.screenshot({ path: `${screenshotDir}/${viewport.name}-studio.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.sidebar button[data-page="assets"]').click();
  await page.locator('#assetGrid img').last().waitFor({ state: 'visible' });
  const brokenImages = await page.locator('#assetGrid img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src));
  assert.deepEqual(brokenImages, [], 'All shipped brand assets should render in Asset Studio.');
  assert.deepEqual(pageErrors, [], `Browser reported runtime errors: ${pageErrors.join(' | ')}`);
  console.log('PASS: desktop/tablet/mobile navigation, no horizontal overflow, module search, workflow preset/result, theme switch, all shipped assets, and zero browser runtime errors.');
} finally {
  await browser.close();
}
