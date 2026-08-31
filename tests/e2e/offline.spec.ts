/**
 * Offline support E2E (ADR 0005, TASKS.md P-6). Both tests below spin up
 * their own dedicated, throwaway static server (never the shared
 * playwright.config.ts webServer other spec files use) instead of relying
 * on Playwright's `context.setOffline()` / CDP network-condition
 * emulation or `page.route()` interception. Verified empirically: in this
 * Chromium build, CDP offline emulation and route interception both
 * intercept renderer sub-resource requests (scripts, dynamic `import()`)
 * AND the browser's own Service-Worker-script update-check fetch BEFORE
 * they ever reach the real network stack or the SW's `fetch` handler —
 * only top-level page navigation is reliably interceptable. A precached
 * module chunk (confirmed present via `caches.keys()`) still failed to
 * load under `setOffline(true)`, and a `page.route('**\/sw.js', ...)`
 * stub was never even invoked for `registration.update()`'s own fetch.
 * Both are known categories of CDP/Playwright limitation, not app bugs.
 *
 * The robust alternative: real files on a real (but disposable, per-test)
 * server. No CDP layer to get in the way, so a cache hit can only come
 * from the Service Worker's own cache-first fetch handler, and a killed
 * server or a byte-different script behaves exactly like production.
 */
import { test, expect, type Browser } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '../..');
const distDir = path.join(root, 'dist');

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

async function waitForActiveController(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active && !!navigator.serviceWorker.controller;
  });
}

/** Serves `rootDir` at `/phys-viz/...`, mirroring vite.config.ts's `base`. */
function serveStatic(rootDir: string, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      // Mirrors vite preview's own redirect from the bare origin root to
      // the configured base — page.goto('/') resolves against baseURL
      // via the standard URL constructor, which treats a leading '/' as
      // "the origin root", not "baseURL" (see tests/e2e/smoke.spec.ts's
      // own comment on the same gotcha for hash routes).
      if (url.pathname === '/') {
        res.writeHead(302, { Location: '/phys-viz/' });
        res.end();
        return;
      }
      let rel = decodeURIComponent(url.pathname.replace(/^\/phys-viz\/?/, ''));
      if (rel === '') rel = 'index.html';
      const filePath = path.join(rootDir, rel);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
        });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(port, () => resolve(server));
  });
}

function killDedicatedServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

test('a module never visited while online still works after the origin server disappears entirely (P-6)', async ({
  browser,
}: {
  browser: Browser;
}) => {
  const port = 4198;
  const server = await serveStatic(distDir, port);
  try {
    const context = await browser.newContext({ baseURL: `http://localhost:${port}/phys-viz/` });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await waitForActiveController(page);

    // Nothing is listening on this port from here on — a genuinely dead
    // origin, not CDP emulation.
    await killDedicatedServer(server);

    // First visit to this module happens with the server dead — proves
    // the module's lazily-loaded chunk (§11) was precached, not just the
    // shell (P-2). Hash routing means this is a same-document
    // navigation that still issues a real request for the module chunk.
    await page.goto('#/m/fields-gradients');
    const canvas = page.locator('canvas.pv-viewport-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1000);

    // A hard reload with the server dead exercises the full shell
    // (index.html, entry JS, vendor/three/katex chunks) from cache too.
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1000);

    // Layer toggle and timeline scrub round-trip through the store and
    // the module's update() — proves the page is fully interactive
    // offline, not just a static screenshot of cached HTML.
    const layerCheckbox = page.getByRole('checkbox', { name: 'Gradient field (whole domain)' });
    await layerCheckbox.check();
    await expect(layerCheckbox).toBeChecked();

    const scrubber = page.getByRole('slider', { name: 'Scrub time' });
    await scrubber.fill('2');
    await expect(scrubber).toHaveValue('2');

    expect(errors).toEqual([]);
    await context.close();
  } finally {
    server.close();
  }
});

test('an update to a newer version is detected but never swaps code until the user clicks reload, and drops the old cache (P-3, P-6)', async ({
  browser,
}: {
  browser: Browser;
}) => {
  const port = 4197;
  // A private copy of dist/ so mutating sw.js here can never race with
  // any other spec file reading the real, shared dist/ output.
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-offline-update-'));
  fs.cpSync(distDir, tempDir, { recursive: true });

  const server = await serveStatic(tempDir, port);
  try {
    const context = await browser.newContext({ baseURL: `http://localhost:${port}/phys-viz/` });
    const page = await context.newPage();

    await page.goto('/');
    await waitForActiveController(page);

    const swPath = path.join(tempDir, 'sw.js');
    const currentSw = fs.readFileSync(swPath, 'utf-8');
    const versionMatch = currentSw.match(/const VERSION = '([^']+)';/);
    expect(versionMatch).not.toBeNull();
    const oldCacheName = `pv-cache-${versionMatch![1]}`;

    // Simulates a new deploy: a byte-different sw.js, on the SAME real
    // server, so the browser's own update-check fetch (not interceptable
    // via page.route in this environment — see file header) sees a
    // genuine difference exactly like it would after a real deploy.
    fs.writeFileSync(
      swPath,
      currentSw.replace(/const VERSION = '[^']+';/, "const VERSION = 'e2e-simulated-update';"),
    );

    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    // Never auto-applied: the notice must appear without the page having
    // reloaded or changed underneath the user (ADR 0005).
    const notice = page.getByText('A new version is available.');
    await expect(notice).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('canvas.pv-viewport-canvas, .pv-gallery')).toBeVisible();

    const cacheNamesBeforeReload = await page.evaluate(() => caches.keys());
    expect(cacheNamesBeforeReload).toContain(oldCacheName);

    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Reload' }).click(),
    ]);

    const cacheNamesAfterReload = await page.evaluate(() => caches.keys());
    expect(cacheNamesAfterReload).not.toContain(oldCacheName);
    expect(cacheNamesAfterReload).toContain('pv-cache-e2e-simulated-update');

    await context.close();
  } finally {
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
