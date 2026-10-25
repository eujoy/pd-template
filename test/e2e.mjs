// Browser check, run by hand: node test/e2e.mjs [screenshot-dir]
// Uses the preinstalled Playwright (set PLAYWRIGHT_MODULE_PATH if it is not resolvable).
// Not part of `npm test`, which needs no browser.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { goldenFragment } from "./helpers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const shots = process.argv[2];

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const file = path.join(root, url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname);
  try {
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const problems = [];
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
page.on("pageerror", (e) => problems.push(String(e)));

async function open(hash, name) {
  await page.goto(base + (hash ? "#" + hash : ""));
  await page.reload();
  await page.waitForSelector("#app > *");
  if (shots && name) await page.screenshot({ path: path.join(shots, name + ".png") });
}
const text = () => page.locator("#app").innerText();

await open("", "first");
assert.match(await text(), /Scan a day/);

await open(goldenFragment("day-normal"), "normal");
assert.match(await text(), /Thu · 22-10-2026/);
assert.equal(await page.locator(".card").count(), 4);
const link = page.locator('a[href="https://github.com/acme/webapp/pull/181"]');
assert.equal(await link.getAttribute("target"), "_blank");
assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
assert.ok(await link.locator("i.fa-code-pull-request").count());
const firstHead = page.locator(".card-h").first();
await firstHead.click();
assert.equal(await firstHead.getAttribute("aria-expanded"), "false");
assert.ok(await page.locator(".card").first().locator("> ul").isHidden());
await firstHead.click();
assert.ok(await page.locator(".card").first().locator("> ul").isVisible());

await open(goldenFragment("day-truncated"), "truncated");
assert.match(await text(), /Shortened to fit the QR code: 7 items/);

await open(goldenFragment("day-off"), "day-off");
assert.match(await text(), /Day off/);

await open("v1.AAAA", "bad");
assert.match(await text(), /can't be read/);
await open("v2.AAAA");
assert.match(await text(), /newer viewer/);

// Offline: once the service worker has the shell, a scan works with no network.
await open("");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => document.body.classList.contains("offline-ready"));
await page.reload();
await context.setOffline(true);
await page.goto(base + "#" + goldenFragment("day-normal"));
await page.reload();
await page.waitForSelector(".card");
assert.match(await text(), /Thu · 22-10-2026/);
assert.ok(await page.locator(".ro .ok").isVisible());
if (shots) await page.screenshot({ path: path.join(shots, "offline.png") });
await context.setOffline(false);

assert.deepEqual(problems, []);
await browser.close();
server.close();
console.log("e2e ok");
