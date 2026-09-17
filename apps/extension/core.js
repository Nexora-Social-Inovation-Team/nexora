/* global chrome, fetch, URL */
import { categorize } from "./dictionary.js";

export * from "./dictionary.js";

/**
 * The only keys ever written to chrome.storage.local: one seconds-per-category
 * accumulator, the period start, and flags. No url, hostname, tab id or title.
 * Settings (apiBase, token) live in chrome.storage.sync.
 */
export const ACTIVITY_KEYS = [
  "seconds",
  "periodStart",
  "paused",
  "focused",
  "idle",
  "activeCategory",
  "since",
  "sentTotal",
  "lastSentAt",
  "lastStatus",
  "sendBlocked",
];

export const DEFAULT_API_BASE = "http://localhost:3000";

/** Safety-flush alarm: settles a long uninterrupted dwell. The send alarm is five times slower. */
export const FLUSH_MINUTES = 1;
export const SEND_MINUTES = 5;
export const IDLE_SECONDS = 60;

/**
 * A segment longer than two flush windows means the machine slept or the service
 * worker was frozen, not that someone stared at one page that long.
 * ponytail: the rest of a suspend is dropped; a real wake event would be exact.
 */
export const MAX_SEGMENT_SECONDS = 2 * FLUSH_MINUTES * 60;

/** UTC calendar day, YYYY-MM-DD. */
export const todayUtc = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Derives the hostname, maps it and drops it. The URL exists only as a local
 * in this function: it is never stored, sent or logged.
 */
export function categoryOfTab(tab) {
  try {
    return categorize(new URL(tab.url).hostname);
  } catch {
    return null; // no tab, chrome:// page, about:blank
  }
}

/** Nothing accrues while paused, while no Chrome window has focus, or while the machine is idle/locked. */
export const accruing = (state) => !state.paused && state.focused !== false && state.idle !== true;

const addSeconds = (seconds, category, n) =>
  n > 0 ? { ...seconds, [category]: (seconds[category] ?? 0) + n } : seconds;

/**
 * Settles the open segment into the accumulator and re-points the checkpoint at
 * `category`; a missing category or a state that cannot accrue closes it. Pure:
 * every tab, focus, idle and alarm event funnels through this one function.
 */
export function checkpoint(state, category, now) {
  const elapsed =
    state.activeCategory && typeof state.since === "number"
      ? Math.min(Math.floor((now - state.since) / 1000), MAX_SEGMENT_SECONDS)
      : 0;
  const open = Boolean(category) && accruing(state);
  return {
    ...state,
    seconds: addSeconds(state.seconds, state.activeCategory, elapsed),
    activeCategory: open ? category : null,
    since: open ? now : null,
  };
}

/**
 * Rounded minutes per category. A category under half a minute reports 0 and is
 * dropped from the body, but its seconds stay in the accumulator until the day
 * rolls over — rounding delays a partial minute, it never discards one.
 */
export const minutesOf = (seconds) =>
  Object.fromEntries(
    Object.entries(seconds)
      .map(([category, s]) => [category, Math.round(s / 60)])
      .filter(([, minutes]) => minutes > 0),
  );

export const totalMinutes = (minutes) => Object.values(minutes).reduce((sum, n) => sum + n, 0);

/** Popup line: rounded minutes, or "<1 dk" while the first half minute is still adding up. */
export const minutesLabelTr = (seconds) => (seconds >= 30 ? `${Math.round(seconds / 60)} dk` : "<1 dk");

/** Fresh accumulator for `day`. An open checkpoint keeps running into the new period. */
export const startPeriod = (state, day) => ({ ...state, seconds: {}, sentTotal: 0, periodStart: day });

/** Temizle: fresh accumulator, and no open segment carried across the reset. */
export const clearActivity = (state, day = todayUtc()) =>
  startPeriod({ ...state, activeCategory: null, since: null, lastSentAt: null, lastStatus: "" }, day);

/**
 * POST body for /signals/category-summary: one UTC day and the CUMULATIVE
 * category minutes for it. The API upserts with `update: { minutes }`, so every
 * send must carry the running total — posting a delta would replace the day's
 * total with the last chunk.
 */
export const buildSummaryBody = (state) => ({
  period: `${state.periodStart}/${state.periodStart}`,
  minutes: minutesOf(state.seconds),
});

/** Whole minutes accrued since the last successful send. */
export const pendingMinutes = (state) => totalMinutes(minutesOf(state.seconds)) - (state.sentTotal ?? 0);

/** The send alarm fires only with a token, no standing block, and a whole new minute to report. */
export const shouldAutoSend = (state, settings) =>
  Boolean(settings.token) && state.sendBlocked !== true && pendingMinutes(state) >= 1;

export async function loadState(storage = chrome.storage.local) {
  const raw = (await storage.get(ACTIVITY_KEYS)) ?? {};
  return {
    seconds: raw.seconds ?? {},
    periodStart: raw.periodStart ?? todayUtc(),
    paused: raw.paused === true,
    focused: raw.focused !== false,
    idle: raw.idle === true,
    activeCategory: raw.activeCategory ?? null,
    since: typeof raw.since === "number" ? raw.since : null,
    sentTotal: raw.sentTotal ?? 0,
    lastSentAt: typeof raw.lastSentAt === "number" ? raw.lastSentAt : null,
    lastStatus: raw.lastStatus ?? "",
    sendBlocked: raw.sendBlocked === true,
  };
}

export async function saveState(state, storage = chrome.storage.local) {
  await storage.set(Object.fromEntries(ACTIVITY_KEYS.map((key) => [key, state[key]])));
}

export async function loadSettings(storage = chrome.storage.sync) {
  const raw = (await storage.get(["apiBase", "token"])) ?? {};
  return { apiBase: raw.apiBase || DEFAULT_API_BASE, token: raw.token || "" };
}

/** Category of the active tab of the focused window; the URL never leaves categoryOfTab. */
export async function activeCategory() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab ? categoryOfTab(tab) : null;
}

/**
 * The single write path: apply a flag change, settle the elapsed segment,
 * re-point the checkpoint, and roll the UTC day over (sending the finished day
 * first). Two events in the same tick compute the same settle, so the last
 * write wins harmlessly.
 */
export async function update(patch = {}, now = Date.now(), fetchImpl = fetch) {
  const loaded = { ...(await loadState()), ...patch };
  const category = accruing(loaded) ? await activeCategory() : null;
  let state = checkpoint(loaded, category, now);
  const today = todayUtc(new Date(now));
  if (state.periodStart !== today) {
    // ponytail: up to one flush window of post-midnight time lands in the
    // finished day. Upgrade path: split the segment at the day boundary.
    state = startPeriod(await deliver(state, await loadSettings(), now, fetchImpl), today);
  }
  await saveState(state);
  return state;
}

/** Sends category minutes only. Failures are values, not throws. */
export async function sendSummary({ apiBase, token, body }, fetchImpl = fetch) {
  const res = await fetchImpl(`${apiBase.replace(/\/+$/, "")}/signals/category-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/**
 * One cumulative POST for the current period. The accumulator is never cleared
 * here: only a day rollover or Temizle clears it, because the API replaces the
 * period total with whatever the last POST carried.
 */
export async function deliver(state, settings, now = Date.now(), fetchImpl = fetch) {
  const body = buildSummaryBody(state);
  const total = totalMinutes(body.minutes);
  if (total < 1) return { ...state, lastStatus: "Gönderilecek kategori dakikası yok." };
  if (!settings.token) return { ...state, lastStatus: "Önce ayarlardan oturum anahtarını gir." };
  let result = null;
  try {
    result = await sendSummary({ ...settings, body }, fetchImpl);
  } catch {
    result = null; // network/CORS failure: nothing about it is logged
  }
  const code = result?.body?.error?.code;
  const ok = result?.status === 201;
  return {
    ...state,
    sentTotal: ok ? total : state.sentTotal,
    lastSentAt: ok ? now : state.lastSentAt,
    lastStatus: resultMessageTr(result),
    // A youth still waiting for approval, or a stale key, is not retried in a
    // loop: the block lifts on a settings change or a manual press.
    sendBlocked: code === "consent_missing" || code === "unauthorized",
  };
}

/** The send alarm: settle first, then one cumulative POST when there is something new to say. */
export async function autoSend(now = Date.now(), fetchImpl = fetch) {
  const state = await update({}, now, fetchImpl);
  const settings = await loadSettings();
  if (!shouldAutoSend(state, settings)) return state;
  const next = await deliver(state, settings, now, fetchImpl);
  await saveState(next);
  return next;
}

/** "Şimdi gönder": always attempts, lifts the block, never clears the accumulator. */
export async function sendNow(now = Date.now(), fetchImpl = fetch) {
  const state = { ...(await update({}, now, fetchImpl)), sendBlocked: false };
  const next = await deliver(state, await loadSettings(), now, fetchImpl);
  await saveState(next);
  return next;
}

/** A settings change (new key, new address) lifts the auto-send block. */
export async function unblockSending() {
  const state = await loadState();
  if (!state.sendBlocked) return state;
  const next = { ...state, sendBlocked: false };
  await saveState(next);
  return next;
}

/** Turkish popup line for a send result; `null` means the request never left the browser. */
export function resultMessageTr(result) {
  if (!result) return "Bağlantı kurulamadı. Sunucu adresini ayarlardan kontrol et.";
  if (result.status === 201) return `Özet gönderildi. Skorun: ${result.body?.score?.value ?? "-"}`;
  switch (result.body?.error?.code) {
    case "consent_missing":
      return "Veli onayı olmadan bu işlem yapılamaz.";
    case "unauthorized":
      return "Oturum anahtarı geçersiz. Ayarlardan yeni bir anahtar gir.";
    case "validation_error":
      return "Özet geçersiz. Dakikaları temizleyip yeniden dene.";
    default:
      return "Özet gönderilemedi. Sunucu adresini ve anahtarı ayarlardan kontrol et.";
  }
}
