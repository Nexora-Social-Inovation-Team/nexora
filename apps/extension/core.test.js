/* global URL */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { CATEGORY_LABELS_TR, categoryMinutesSchema, findForbiddenKey, signalsRequestSchema } from "@nexora/shared";
import {
  LABELS_TR,
  buildSummaryBody,
  categorize,
  heartbeat,
  loadState,
  resultMessageTr,
  sendSummary,
  tick,
} from "./core.js";

const dir = fileURLToPath(new URL(".", import.meta.url));

/** Minimal fake of the three chrome APIs the extension uses. */
function fakeChrome(initial = {}) {
  const local = { ...initial };
  const fake = {
    dump: local,
    tab: null,
    tabs: { query: async () => (fake.tab ? [fake.tab] : []) },
    storage: {
      local: {
        get: async (keys) => Object.fromEntries(keys.filter((k) => k in local).map((k) => [k, local[k]])),
        set: async (obj) => void Object.assign(local, obj),
      },
    },
  };
  return fake;
}

const VISITS = [
  "https://tr.wikipedia.org/wiki/Bilim",
  "https://www.youtube.com/watch?v=abc123",
  "https://forum.example.net/thread/9",
  "https://wikipedia.org/",
  "https://m.youtube.com/feed",
];

async function runTicks(fake, urls = VISITS) {
  for (const url of urls) {
    fake.tab = { url };
    await heartbeat();
  }
}

describe("categorize", () => {
  it("matches a host and its subdomains, ignores look-alikes and unknown hosts", () => {
    expect(categorize("wikipedia.org")).toBe("science");
    expect(categorize("TR.Wikipedia.ORG")).toBe("science");
    expect(categorize("m.youtube.com")).toBe("entertainment");
    expect(categorize("kultur.gov.tr")).toBe("culture");
    expect(categorize("notwikipedia.org")).toBeNull();
    expect(categorize("wikipedia.org.evil.example")).toBeNull();
    expect(categorize("haber.example.com")).toBeNull();
    expect(categorize("")).toBeNull();
  });

  it("keeps the Turkish labels in sync with @nexora/shared", () => {
    expect(LABELS_TR).toEqual(CATEGORY_LABELS_TR);
  });
});

describe("heartbeat accounting", () => {
  let fake;

  beforeEach(() => {
    fake = fakeChrome();
    globalThis.chrome = fake;
  });

  it("counts wikipedia and youtube, ignores the unknown host", async () => {
    await runTicks(fake);
    expect(fake.dump.minutes).toEqual({ science: 2, entertainment: 2 });
  });

  it("stores minutes/periodStart/paused only — no url, hostname or domain", async () => {
    await runTicks(fake);
    expect(Object.keys(fake.dump).sort()).toEqual(["minutes", "paused", "periodStart"]);
    const dump = JSON.stringify(fake.dump);
    expect(dump).not.toMatch(/http/i);
    expect(dump).not.toMatch(/\.(com|org|net|tr|io|gov)\b/i);
    expect(dump).not.toMatch(/wikipedia|youtube|example/i);
    expect(findForbiddenKey(fake.dump)).toBeNull();
    expect(fake.dump.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("stops incrementing while paused and resumes after", async () => {
    globalThis.chrome = fake = fakeChrome({ minutes: { science: 3 }, periodStart: "2026-09-09", paused: true });
    await runTicks(fake);
    expect(fake.dump.minutes).toEqual({ science: 3 });

    fake.dump.paused = false;
    await runTicks(fake, [VISITS[0]]);
    expect(fake.dump.minutes).toEqual({ science: 4 });
  });

  it("ignores tabs with no mappable url", async () => {
    fake.tab = { url: "chrome://extensions" };
    await heartbeat();
    fake.tab = {};
    await heartbeat();
    fake.tab = null;
    await heartbeat();
    expect(fake.dump.minutes ?? {}).toEqual({});
  });

  it("tick is pure", () => {
    const state = { minutes: { science: 1 }, periodStart: "2026-09-09", paused: false };
    expect(tick(state, "entertainment")).toEqual({ ...state, minutes: { science: 1, entertainment: 1 } });
    expect(state.minutes).toEqual({ science: 1 });
    expect(tick(state, null)).toBe(state);
  });
});

describe("summary payload", () => {
  it("passes the shared schemas and carries no forbidden key", async () => {
    const fake = fakeChrome();
    globalThis.chrome = fake;
    await runTicks(fake);

    const body = buildSummaryBody(await loadState(), "2026-09-16");
    expect(signalsRequestSchema.parse(body)).toEqual(body);
    expect(categoryMinutesSchema.parse(body.minutes)).toEqual(body.minutes);
    expect(findForbiddenKey(body)).toBeNull();
    expect(Object.keys(body).sort()).toEqual(["minutes", "period"]);
  });

  it("sends a bearer token and a body with nothing but period and minutes", async () => {
    let seen = null;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return { status: 201, json: async () => ({ id: "sig_1", score: { value: 80 } }) };
    };
    const body = { period: "2026-09-09/2026-09-16", minutes: { science: 2 } };
    const result = await sendSummary({ apiBase: "http://localhost:3000/", token: "tok", body }, fetchImpl);

    expect(seen.url).toBe("http://localhost:3000/signals/category-summary");
    expect(seen.init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(seen.init.body)).toEqual(body);
    expect(resultMessageTr(result)).toBe("Özet gönderildi. Skorun: 80");
  });

  it("maps consent_missing and transport failures to Turkish copy", () => {
    expect(resultMessageTr({ status: 403, body: { error: { code: "consent_missing", message: "x" } } })).toBe(
      "Veli onayı olmadan bu işlem yapılamaz.",
    );
    expect(resultMessageTr({ status: 401, body: { error: { code: "unauthorized" } } })).toMatch(/anahtar/i);
    expect(resultMessageTr(null)).toMatch(/Bağlantı kurulamadı/);
  });
});

describe("static privacy scan", () => {
  const sources = readdirSync(dir).filter((f) => /\.(js|html|json)$/.test(f) && !f.endsWith(".test.js"));

  it("scans every shipped source file", () => {
    expect(sources).toEqual(
      expect.arrayContaining(["background.js", "core.js", "dictionary.js", "manifest.json", "options.js", "popup.js"]),
    );
  });

  it("has no console call mentioning a url", () => {
    for (const file of sources) {
      const text = readFileSync(join(dir, file), "utf8");
      for (const call of text.match(/console\.\w+\([^)]*\)/g) ?? []) {
        expect(`${file}: ${call}`).not.toMatch(/url/i);
      }
    }
  });

  it("asks for no page access in the manifest", () => {
    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    expect(JSON.stringify(manifest)).not.toContain("<all_urls>");
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.web_accessible_resources).toBeUndefined();
    expect(manifest.permissions).toEqual(["tabs", "storage", "alarms"]);
    expect(manifest.host_permissions).toEqual(["http://localhost:3000/*"]);
  });
});
