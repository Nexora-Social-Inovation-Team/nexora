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
    await expect(page.getByRole("status")).toContainText("Sayım sürüyor");
  } finally {
    await context.close();
  }
});
