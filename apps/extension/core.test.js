/* global URL, setTimeout */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CATEGORY_LABELS_TR, categoryMinutesSchema, findForbiddenKey, signalsRequestSchema } from "@nexora/shared";
import {
  ACTIVITY_KEYS,
  LABELS_TR,
  MAX_SEGMENT_SECONDS,
  autoSend,
  buildSummaryBody,
  categorize,
  checkpoint,
  clearActivity,
  loadState,
  minutesOf,
  resultMessageTr,
  saveState,
  sendNow,
  sendSummary,
  todayUtc,
  unblockSending,
  update,
} from "./core.js";

const dir = fileURLToPath(new URL(".", import.meta.url));

const WIKI = "https://tr.wikipedia.org/wiki/Bilim";
const YT = "https://www.youtube.com/watch?v=abc123";
const UNKNOWN = "https://forum.example.net/thread/9";

/** Injected clock: a fixed UTC morning so the day never rolls over by accident. */
const DAY = "2026-09-17";
const T0 = Date.UTC(2026, 8, 17, 9, 0, 0);
const at = (seconds) => T0 + seconds * 1000;

/** Minimal fake of the chrome APIs the extension uses. Listeners are captured, not fired. */
function fakeChrome(initial = {}) {
  const local = { ...initial };
  const sync = {};
  const listeners = {};
  const on = (name) => ({ addListener: (fn) => (listeners[name] = fn) });
  const pick = (store, keys) =>
    keys ? Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]])) : { ...store };
  /** chrome.storage is IPC, not a memory write: `storageDelay` gives get/set a real async gap. */
  const gap = () => (fake.storageDelay ? new Promise((resolve) => setTimeout(resolve, fake.storageDelay)) : null);
  const area = (store) => ({
    get: async (keys) => {
      await gap();
      return pick(store, keys);
    },
    set: async (obj) => {
      await gap();
      Object.assign(store, obj);
    },
  });
  const fake = {
    dump: local,
    storageDelay: 0,
    sync,
    listeners,
    tab: null,
    alarmsCreated: [],
    tabs: { query: async () => (fake.tab ? [fake.tab] : []), onActivated: on("activated"), onUpdated: on("updated") },
    windows: { WINDOW_ID_NONE: -1, onFocusChanged: on("focus") },
    idle: {
      detection: 0,
      setDetectionInterval: (n) => void (fake.idle.detection = n),
      onStateChanged: on("idle"),
    },
    alarms: { create: (name, opts) => void fake.alarmsCreated.push({ name, ...opts }), onAlarm: on("alarm") },
    runtime: { onInstalled: on("installed"), onStartup: on("startup") },
    storage: { local: area(local), sync: area(sync), onChanged: on("changed") },
  };
  return fake;
}

/** Lets every floated `void update()` / `void autoSend()` settle before asserting. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const ok201 = async () => ({ status: 201, json: async () => ({ id: "sig_1", score: { value: 80 } }) });
const deny403 = async () => ({
  status: 403,
  json: async () => ({ error: { code: "consent_missing", message: "Veli onayı yok." } }),
});

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

describe("second-accurate accounting", () => {
  let fake;

  /** One chrome event: the tab the user is looking at, at second `seconds`. */
  const visit = (url, seconds, patch = {}) => {
    fake.tab = url ? { url } : null;
    return update(patch, at(seconds));
  };

  beforeEach(() => {
    fake = fakeChrome({ periodStart: DAY });
    globalThis.chrome = fake;
  });

  it("credits BOTH categories when the user switches tabs inside one minute", async () => {
    await visit(WIKI, 0);
    await visit(YT, 20); // 20 s of science settled here, not lost to the next tick
    await visit(WIKI, 50); // 30 s of entertainment
    const state = await visit(null, 60); // 10 s of science

    expect(state.seconds).toEqual({ science: 30, entertainment: 30 });
    expect(Object.keys(minutesOf(state.seconds)).sort()).toEqual(["entertainment", "science"]);
  });

  it("credits the time before the first alarm instead of rounding it away", async () => {
    await visit(WIKI, 0);
    const state = await update({}, at(45)); // first safety flush, 45 s in
    expect(state.seconds).toEqual({ science: 45 });
  });

  it("stops accruing with no focused window and resumes when focus comes back", async () => {
    await visit(WIKI, 0);
    let state = await visit(WIKI, 30, { focused: false }); // WINDOW_ID_NONE
    expect(state.seconds).toEqual({ science: 30 });
    expect(state.activeCategory).toBeNull();

    state = await update({}, at(300)); // flush alarms while another app has focus
    expect(state.seconds).toEqual({ science: 30 });

    state = await update({ focused: true }, at(300));
    expect(state.activeCategory).toBe("science");
    expect((await update({}, at(330))).seconds).toEqual({ science: 60 });
  });

  it("stops accruing while idle or locked and resumes on active", async () => {
    await visit(WIKI, 0);
    let state = await visit(WIKI, 60, { idle: true }); // idle or locked
    expect(state.seconds).toEqual({ science: 60 });
    expect(state.activeCategory).toBeNull();

    state = await update({}, at(3600)); // an hour of idle flushes
    expect(state.seconds).toEqual({ science: 60 });

    state = await update({ idle: false }, at(3600));
    expect(state.activeCategory).toBe("science");
    expect((await update({}, at(3630))).seconds).toEqual({ science: 90 });
  });

  it("caps a single segment so a suspended machine cannot credit hours", async () => {
    await visit(WIKI, 0);
    const state = await update({}, at(8 * 3600));
    expect(state.seconds).toEqual({ science: MAX_SEGMENT_SECONDS });
  });

  it("pauses accrual and clears it with Temizle", async () => {
    await visit(WIKI, 0);
    let state = await visit(WIKI, 60, { paused: true });
    expect(state.seconds).toEqual({ science: 60 });
    expect(state.activeCategory).toBeNull();

    state = await visit(WIKI, 300); // flushes while paused
    expect(state.seconds).toEqual({ science: 60 });

    state = await visit(WIKI, 300, { paused: false });
    expect((await visit(WIKI, 360)).seconds).toEqual({ science: 120 });

    await saveState(clearActivity(await loadState(), DAY));
    expect((await loadState()).seconds).toEqual({});
    expect((await visit(WIKI, 420)).seconds).toEqual({}); // no phantom segment survives the reset
  });

  it("adds nothing at all for an unknown host or an unmappable tab", async () => {
    await visit(UNKNOWN, 0);
    expect((await visit(UNKNOWN, 600)).seconds).toEqual({});
    await visit("chrome://extensions", 600);
    expect((await visit(null, 1200)).seconds).toEqual({});
    fake.tab = {};
    expect((await update({}, at(1800))).seconds).toEqual({});
  });

  it("keeps checkpoint pure", () => {
    const state = { seconds: { science: 10 }, activeCategory: "science", since: at(0), paused: false };
    const next = checkpoint(state, "entertainment", at(30));
    expect(next.seconds).toEqual({ science: 40 });
    expect(next.activeCategory).toBe("entertainment");
    expect(state.seconds).toEqual({ science: 10 });
    expect(checkpoint({ ...state, paused: true }, "entertainment", at(30)).activeCategory).toBeNull();
  });

  it("stores category keys, the period start and flags only — no url, hostname or domain", async () => {
    fake.sync.token = "tok";
    await visit(WIKI, 0);
    await visit(YT, 120);
    await visit(UNKNOWN, 240);
    await autoSend(at(300), deny403);

    expect(Object.keys(fake.dump).sort()).toEqual([...ACTIVITY_KEYS].sort());
    const dump = JSON.stringify(fake.dump);
    expect(dump).not.toMatch(/http/i);
    expect(dump).not.toMatch(/\.(com|org|net|tr|io|gov)\b/i);
    expect(dump).not.toMatch(/wikipedia|youtube|example/i);
    expect(findForbiddenKey(fake.dump)).toBeNull();
    expect(fake.dump.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("cumulative sending", () => {
  let fake;
  let posts;
  const record = (respond) => async (url, init) => {
    posts.push({ url, init, body: JSON.parse(init.body) });
    return respond();
  };
  const visit = (url, seconds, patch = {}) => {
    fake.tab = url ? { url } : null;
    return update(patch, at(seconds));
  };
  /** The safety flush at its real cadence: one settle a minute, never a flat +1. */
  const dwell = async (from, to) => {
    for (let t = from + 60; t <= to; t += 60) await update({}, at(t));
  };

  beforeEach(() => {
    fake = fakeChrome({ periodStart: DAY });
    globalThis.chrome = fake;
    fake.sync.token = "tok";
    posts = [];
  });

  it("posts the running total every time, never the delta, and keeps the accumulator", async () => {
    await visit(WIKI, 0);
    await dwell(0, 120);
    await autoSend(at(120), record(ok201)); // 2 min so far
    await dwell(120, 420);
    await autoSend(at(420), record(ok201)); // 7 min so far

    expect(posts).toHaveLength(2);
    expect(posts[0].body.minutes).toEqual({ science: 2 });
    expect(posts[1].body.minutes).toEqual({ science: 7 }); // not { science: 5 }
    expect(posts[1].body.minutes.science).toBeGreaterThan(posts[0].body.minutes.science);

    const state = await loadState();
    expect(state.seconds).toEqual({ science: 420 }); // a 201 does not wipe the day
    expect(state.sentTotal).toBe(7);
    expect(state.lastSentAt).toBe(at(420));
  });

  it("does not repeat a send until another whole minute is pending", async () => {
    await visit(WIKI, 0);
    await dwell(0, 120);
    await autoSend(at(120), record(ok201));
    await autoSend(at(140), record(ok201)); // +20 s: still 2 min
    expect(posts).toHaveLength(1);
    await autoSend(at(200), record(ok201)); // 3 min
    expect(posts).toHaveLength(2);
  });

  it("sends the finished period on the UTC day rollover, then starts a fresh accumulator", async () => {
    await visit(WIKI, 0);
    await dwell(0, 600);
    await visit(WIKI, 600, { paused: true }); // close the segment before midnight
    fake.tab = { url: WIKI };
    const rolled = await update({ paused: false }, Date.UTC(2026, 8, 18, 0, 0, 30), record(ok201));

    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ period: "2026-09-17/2026-09-17", minutes: { science: 10 } });
    expect(rolled.periodStart).toBe("2026-09-18");
    expect(rolled.seconds).toEqual({});
    expect(rolled.sentTotal).toBe(0);
    expect(rolled.activeCategory).toBe("science"); // the new day keeps counting

    for (const minute of [1, 2, 3]) await update({}, Date.UTC(2026, 8, 18, 0, minute, 30), record(ok201));
    await autoSend(Date.UTC(2026, 8, 18, 0, 3, 30), record(ok201));
    expect(posts[1].body).toEqual({ period: "2026-09-18/2026-09-18", minutes: { science: 3 } });
  });

  it("stops auto-sending after 403 consent_missing and resumes on a settings change", async () => {
    await visit(WIKI, 0);
    await dwell(0, 120);
    await autoSend(at(120), record(deny403));
    expect(posts).toHaveLength(1);
    expect((await loadState()).sendBlocked).toBe(true);

    await autoSend(at(600), record(deny403)); // no tight retry loop
    await autoSend(at(900), record(deny403));
    expect(posts).toHaveLength(1);

    await unblockSending(); // the parent approved and a new key was saved
    await autoSend(at(1200), record(ok201));
    expect(posts).toHaveLength(2);
    expect((await loadState()).sendBlocked).toBe(false);
  });

  it("lets a manual press through while blocked, without clearing the accumulator", async () => {
    await visit(WIKI, 0);
    await dwell(0, 120);
    await autoSend(at(120), record(deny403));
    expect(posts).toHaveLength(1);

    const state = await sendNow(at(180), record(ok201));
    expect(posts).toHaveLength(2);
    expect(posts[1].body.minutes).toEqual({ science: 3 });
    expect(state.sendBlocked).toBe(false);
    expect(state.seconds).toEqual({ science: 180 });
    expect(state.lastStatus).toBe("Özet gönderildi. Skorun: 80");
  });

  it("does not auto-send without a token", async () => {
    delete fake.sync.token;
    await visit(WIKI, 0);
    await dwell(0, 600);
    await autoSend(at(600), record(ok201));
    expect(posts).toHaveLength(0);
  });
});

describe("concurrent events", () => {
  let fake;

  beforeEach(() => {
    fake = fakeChrome({ periodStart: DAY });
    fake.storageDelay = 8; // a chrome.storage.local round trip, not a memory write
    globalThis.chrome = fake;
  });

  it("does not lose an idle transition to a tab switch fired in the same instant", async () => {
    fake.tab = { url: WIKI };
    await update({}, at(0));

    // idle.onStateChanged and tabs.onActivated: background.js floats both with
    // `void update()`, so neither waits for the other's load -> settle -> save.
    const idled = update({ idle: true }, at(35));
    fake.tab = { url: YT };
    const switched = update({}, at(35));
    await Promise.all([idled, switched]);

    const state = await loadState();
    expect(state.idle).toBe(true); // the idle flag reached storage
    expect(state.activeCategory).toBeNull(); // and accrual really stopped
    expect(state.seconds).toEqual({ science: 35 }); // nothing credited past the transition
  });

  it("keeps a tab switch that lands inside the auto-send round trip", async () => {
    const posts = [];
    const slowFetch = async (_url, init) => {
      posts.push(JSON.parse(init.body));
      await new Promise((resolve) => setTimeout(resolve, 150)); // an ordinary HTTP latency
      return { status: 201, json: async () => ({ id: "sig_1", score: { value: 80 } }) };
    };
    fake.sync.token = "tok";
    fake.tab = { url: WIKI };
    for (let t = 0; t <= 300; t += 60) await update({}, at(t)); // five minutes of science

    const sending = autoSend(at(300), slowFetch);
    await new Promise((resolve) => setTimeout(resolve, 60)); // the user switches mid-send
    fake.tab = { url: YT };
    const switched = update({}, at(360));
    await Promise.all([sending, switched]);

    const state = await loadState();
    expect(posts).toEqual([{ period: `${DAY}/${DAY}`, minutes: { science: 5 } }]);
    expect(state.sentTotal).toBe(5);
    expect(state.activeCategory).toBe("entertainment"); // the switch was not reverted
    expect(state.since).toBe(at(360));
    expect(state.seconds).toEqual({ science: 360 });
  });
});

describe("summary payload", () => {
  it("passes the shared schemas and carries no forbidden key", async () => {
    const fake = fakeChrome({ periodStart: DAY });
    globalThis.chrome = fake;
    fake.tab = { url: WIKI };
    for (let t = 0; t <= 300; t += 60) await update({}, at(t)); // five minutes of flushes
    fake.tab = { url: YT };
    for (let t = 360; t <= 600; t += 60) await update({}, at(t));

    const body = buildSummaryBody(await loadState());
    expect(signalsRequestSchema.parse(body)).toEqual(body);
    expect(categoryMinutesSchema.parse(body.minutes)).toEqual(body.minutes);
    expect(findForbiddenKey(body)).toBeNull();
    expect(Object.keys(body).sort()).toEqual(["minutes", "period"]);
    // the switch lands on the 360 s flush, so science keeps that minute
    expect(body).toEqual({ period: `${DAY}/${DAY}`, minutes: { science: 6, entertainment: 4 } });
  });

  it("sends a bearer token and a body with nothing but period and minutes", async () => {
    let seen = null;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return { status: 201, json: async () => ({ id: "sig_1", score: { value: 80 } }) };
    };
    const body = { period: "2026-09-16/2026-09-16", minutes: { science: 2 } };
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

describe("background wiring", () => {
  const bg = fakeChrome();

  beforeAll(async () => {
    globalThis.chrome = bg;
    await import("./background.js");
  });

  beforeEach(() => {
    globalThis.chrome = bg;
    for (const key of Object.keys(bg.dump)) delete bg.dump[key];
    for (const key of Object.keys(bg.sync)) delete bg.sync[key];
    bg.alarmsCreated.length = 0;
    bg.tab = { url: WIKI };
  });

  it("registers a safety flush, a send alarm and idle detection", () => {
    bg.listeners.installed();
    expect(bg.alarmsCreated).toEqual([
      { name: "nexora-flush", periodInMinutes: 1 },
      { name: "nexora-send", periodInMinutes: 5 },
    ]);
    expect(bg.idle.detection).toBe(60);
  });

  it("listens to every event that changes the situation", () => {
    expect(Object.keys(bg.listeners).sort()).toEqual(
      ["activated", "alarm", "changed", "focus", "idle", "installed", "startup", "updated"].sort(),
    );
  });

  it("maps WINDOW_ID_NONE to a stop and a real window id to a resume", async () => {
    bg.listeners.focus(-1);
    await settled();
    expect(bg.dump.focused).toBe(false);
    expect(bg.dump.activeCategory).toBeNull();

    bg.listeners.focus(7);
    await settled();
    expect(bg.dump.focused).toBe(true);
    expect(bg.dump.activeCategory).toBe("science");
  });

  it("maps idle and locked to a stop and active to a resume", async () => {
    for (const state of ["idle", "locked"]) {
      bg.listeners.idle(state);
      await settled();
      expect(bg.dump.idle).toBe(true);
      expect(bg.dump.activeCategory).toBeNull();
    }
    bg.listeners.idle("active");
    await settled();
    expect(bg.dump.idle).toBe(false);
    expect(bg.dump.activeCategory).toBe("science");
  });

  it("only reacts to an onUpdated event that actually changed the url", async () => {
    bg.listeners.updated(1, { status: "loading" });
    await settled();
    expect(bg.dump.activeCategory).toBeUndefined();

    bg.listeners.updated(1, { url: "https://tr.wikipedia.org/wiki/Fizik" });
    await settled();
    expect(bg.dump.activeCategory).toBe("science");
  });

  it("delivers on the send alarm only, and lifts a block when settings change", async () => {
    const posts = [];
    globalThis.fetch = async (url, init) => {
      posts.push(JSON.parse(init.body));
      return { status: 201, json: async () => ({ id: "sig_1", score: { value: 80 } }) };
    };
    const today = todayUtc(); // the wiring runs on the real clock, so the period is the real day
    Object.assign(bg.dump, { seconds: { science: 120 }, sentTotal: 0, periodStart: today });
    bg.sync.token = "tok";

    bg.listeners.alarm({ name: "nexora-flush" });
    await settled();
    expect(posts).toHaveLength(0);

    bg.listeners.alarm({ name: "nexora-send" });
    await settled();
    expect(posts).toEqual([{ period: `${today}/${today}`, minutes: { science: 2 } }]);

    bg.dump.sendBlocked = true;
    bg.listeners.changed({ token: { newValue: "tok2" } }, "sync");
    await settled();
    expect(bg.dump.sendBlocked).toBe(false);
  });
});

describe("static privacy scan", () => {
  const sources = readdirSync(dir).filter((f) => /\.(js|html|json)$/.test(f) && !f.endsWith(".test.js"));

  it("scans every shipped source file", () => {
    expect(sources).toEqual(
      expect.arrayContaining(["background.js", "core.js", "dictionary.js", "manifest.json", "options.js", "popup.js"]),
    );
  });

  it("has no console call mentioning a url, tab.url or a hostname", () => {
    for (const file of sources) {
      const text = readFileSync(join(dir, file), "utf8");
      for (const call of text.match(/console\.\w+\([^)]*\)/g) ?? []) {
        expect(`${file}: ${call}`).not.toMatch(/url|hostname|host\b/i);
      }
    }
  });

  it("asks for no page access in the manifest", () => {
    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    expect(JSON.stringify(manifest)).not.toContain("<all_urls>");
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.web_accessible_resources).toBeUndefined();
    expect(manifest.permissions).toEqual(["tabs", "storage", "alarms", "idle"]);
    expect(manifest.host_permissions).toEqual(["http://localhost:3000/*"]);
  });
});
