/* global URL, chrome */
import { fileURLToPath } from "node:url";
import { chromium, expect, test } from "@playwright/test";

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
    await expect(page.getByRole("button", { name: "Özeti gönder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Duraklat" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Henüz kategori dakikası yok");
    await expect(page.getByText("Ham bağlantı toplanmaz; yalnızca kategori dakikaları.")).toBeVisible();

    // Real heartbeats over real tabs. core.js runs in the extension page because the
    // HTML spec forbids dynamic import() inside a service worker; the alarm wiring that
    // calls the same heartbeat() is background.js, whose registration is asserted above.
    for (const visited of ["https://tr.wikipedia.org/wiki/Bilim", "https://www.youtube.com/feed", "https://example.net/"]) {
      const tab = await context.newPage();
      await tab.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: "<p>test</p>" }));
      await tab.goto(visited);
      await tab.bringToFront();
      await page.evaluate(async () => {
        const { heartbeat } = await import("./core.js");
        await heartbeat();
      });
      await tab.close();
    }

    const stored = await page.evaluate(() => chrome.storage.local.get(["minutes", "periodStart", "paused"]));
    expect(stored.minutes).toEqual({ science: 1, entertainment: 1 });
    expect(Object.keys(stored).sort()).toEqual(["minutes", "paused", "periodStart"]);
    expect(JSON.stringify(stored)).not.toMatch(/http|wikipedia|youtube/i);
  } finally {
    await context.close();
  }
});
