/* global URL, chrome */
import { fileURLToPath } from "node:url";
import { chromium, expect, test } from "@playwright/test";
import { ACTIVITY_KEYS } from "../core.js";

// The folder a jury member picks in chrome://extensions → Load unpacked.
const extensionDir = fileURLToPath(new URL("..", import.meta.url));

test("loads unpacked, starts the service worker and opens the popup", async () => {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium", // new headless mode: the only one that runs extensions
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    expect(worker.url()).toContain("background.js");

    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split("/")[2]}/popup.html`);

    await expect(page.getByRole("heading", { name: "Nexora" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Şimdi gönder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Duraklat" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Henüz kategori dakikası yok");
    await expect(page.getByText("Ham bağlantı toplanmaz; yalnızca kategori dakikaları.")).toBeVisible();

    // MEASURED: Chrome derives idle from OS-level input, so the transition is a
    // property of the host, not of the extension. On an automation-only profile
    // it reports "idle" about a second after the worker registers its listener
    // (synthetic CDP input does not clear it) and accruing() then refuses to
    // open a checkpoint; on a developer machine with a human at the keyboard it
    // never fires at all and the key stays unset. Waiting for either outcome
    // fails on the other machine.
    //
    // So: DECLARE the one thing a human machine reports — an active screen —
    // through the extension's own storage key, before each activation, so a late
    // transition cannot silently zero the segment that follows. Nothing else is
    // faked: the tab events, chrome.tabs.query, the worker's checkpoint writes
    // and the popup's live updates below all run for real.
    const declareActive = () => page.evaluate(() => chrome.storage.local.set({ idleState: "active" }));
    await declareActive();

    // Real tabs, real background.js, real clock: three activations inside one
    // minute. Every second of the first two has to survive the switch — the whole
    // point of the event-driven checkpoint. The unit suite owns the exact seconds.
    for (const visited of [
      "https://tr.wikipedia.org/wiki/Bilim",
      "https://www.youtube.com/feed",
      "https://example.net/",
    ]) {
      const tab = await context.newPage();
      await tab.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: "<p>test</p>" }));
      await tab.goto(visited);
      await declareActive();
      await tab.bringToFront();
      await tab.waitForTimeout(1200); // dwell, then the next activation settles it
    }

    await expect
      .poll(async () => {
        const { seconds = {} } = await page.evaluate(() => chrome.storage.local.get("seconds"));
        return Object.keys(seconds).sort();
      }, { timeout: 15_000 })
      .toEqual(["entertainment", "science"]); // both switches credited, example.net ignored

    const stored = await page.evaluate(() => chrome.storage.local.get(null));
    expect(stored.seconds.science).toBeGreaterThan(0);
    expect(stored.seconds.entertainment).toBeGreaterThan(0);
    expect(Object.keys(stored).sort()).toEqual([...ACTIVITY_KEYS].sort());
    expect(JSON.stringify(stored)).not.toMatch(/http|wikipedia|youtube/i);

    // The popup stayed open and followed the worker live (chrome.storage.onChanged).
    await expect(page.locator("#minutes li")).toHaveCount(2);
    await expect(page.getByText("Bilim")).toBeVisible();
    await expect(page.getByText("Eğlence")).toBeVisible();
    // The status line now reports the gate accruing() actually applies. Here the
    // popup is opened as its own tab, so the active tab is a chrome-extension://
    // page that maps to no category — which is exactly what it should say. In
    // the real popup the active tab is whatever the youth is reading.
    await expect(page.getByRole("status")).toContainText("bir kategoriye eşlenmiyor");
  } finally {
    await context.close();
  }
});
