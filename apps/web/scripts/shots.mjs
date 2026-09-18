/* global chrome, console, process, URL */
/**
 * Three screenshots for one slide: the Expo youth app, the MV3 popup and the
 * parent web panel. Run the three dev servers first (docs/DEMO.md), then:
 *
 *     bun run --filter nexora-web shots
 *
 * Everything below is the real app against the real API and a seeded Neon —
 * nothing is mocked, so a shot that renders wrong is telling you something.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = new URL("../../../", import.meta.url);
const OUT = fileURLToPath(new URL("docs/shots/", ROOT));
const EXTENSION = fileURLToPath(new URL("apps/extension/", ROOT));

const WEB = "http://localhost:5173";
const EXPO = "http://localhost:8081";

mkdirSync(OUT, { recursive: true });
const shot = (page, name, opts) => page.screenshot({ path: `${OUT}${name}.png`, ...opts });

/* ------------------------------------------------------------------ mobile */

async function mobile(browser) {
  // A phone, not a narrow desktop: deviceScaleFactor 2 keeps the text crisp on
  // a projector.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  // Metro bundles on first request, so the first paint can take a while.
  await page.goto(EXPO, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const join = page.getByRole("button", { name: "Katıl" });
  await join.waitFor({ timeout: 120_000 });

  /*
   * Run these first so "Katıl" lands on a filled score screen rather than the
   * waiting room (docs/DEMO.md "Running on a physical phone"):
   *
   *   bun run --filter nexora-api db:seed -- --approve
   *   bun run demo:ingest-balanced
   *
   * Re-seed without the flag afterwards to put the demo back on slide 1.
   */
  await join.click();
  // The heading renders over the skeleton, so waiting for it screenshots the
  // loading state. "Bu skor ne anlatıyor?" only exists once the data is in.
  await page.getByText("Bu skor ne anlatıyor?").waitFor({ timeout: 30_000 });
  await page.getByText("Zamanın nereye gitti?").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600); // let the bars settle
  await shot(page, "mobile");
  await context.close();
  console.log("  mobile.png");
}

/* --------------------------------------------------------------- extension */

async function extension() {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    // The real popup is 368x580 (.popup in ui.css); anything else is a lie
    // about how much of the list a user sees at once.
    viewport: { width: 368, height: 580 },
    deviceScaleFactor: 2,
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const page = await context.newPage();
  await page.goto(`chrome-extension://${worker.url().split("/")[2]}/popup.html`);

  // A popup with nothing in it is not a screenshot. Seed one plausible day and
  // an active screen, the same keys background.js writes.
  //
  // After the worker has run its install settle, or it lands on top of this.
  await page.waitForTimeout(1500);
  const seed = () =>
    page.evaluate(() =>
      chrome.storage.local.set({
        idleState: "active",
        // The scroll area fits exactly two rows at 368x580, so a lighter day
        // is the shot that has no half-row at the fold. A real popup does
        // scroll — that is just not what a slide should be arguing about.
        seconds: { science: 2400, entertainment: 7200 },
        periodStart: new Date().toISOString().slice(0, 10),
        lastSentAt: Date.now() - 4 * 60 * 1000,
      }),
    );
  await seed();
  const stored = await page.evaluate(() => chrome.storage.local.get("seconds"));
  if (!stored.seconds?.science) throw new Error("the seed did not stick; the worker clobbered it");
  /*
   * In the real product the popup floats over whatever the youth is reading, so
   * its status line names that page's category. This harness can only open
   * popup.html as its own tab, and a chrome-extension:// page maps to nothing —
   * an artefact of the harness, never a state a user sees. Reporting the tab a
   * teenager would actually have open is the faithful shot, so the query is
   * answered accordingly for the screenshot only.
   */
  await page.addInitScript(() => {
    const real = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = async (info) =>
      info?.active ? [{ url: "https://www.youtube.com/watch?v=x", audible: true, active: true }] : real(info);
  });

  await page.reload();
  await page.getByRole("heading", { name: "Nexora" }).waitFor();
  await page.waitForTimeout(400);
  await shot(page, "extension");
  await context.close();
  console.log("  extension.png");
}

/* --------------------------------------------------------------------- web */

async function web(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${WEB}/app/parent`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Giriş yap" }).click();
  // The heading renders above the loading card, so waiting for it screenshots
  // "Rapor yükleniyor…". These three only exist on a ready report.
  await page.getByText("Kategori dağılımı (dakika)").waitFor({ timeout: 30_000 });
  await page.getByText("Eğilim", { exact: true }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  await shot(page, "web");
  await context.close();
  console.log("  web.png");
}

/* -------------------------------------------------------------------- main */

// channel: the bundled headless shell does not launch on this machine;
// the extension e2e already proved this channel works.
// `node scripts/shots.mjs extension` re-cuts one shot: the extension needs no
// API at all, and the other two want three servers up.
const only = process.argv.slice(2);
const wanted = (name) => only.length === 0 || only.includes(name);

const browser = await chromium.launch({ channel: "chromium" });
try {
  console.log(`writing to ${OUT}`);
  if (wanted("web")) await web(browser);
  if (wanted("extension")) await extension();
  if (wanted("mobile")) await mobile(browser);
} finally {
  await browser.close();
}
