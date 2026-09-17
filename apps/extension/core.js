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
  "idleState",
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

/**
 * chrome.idle detection window. Three minutes is "walked away"; one minute is
 * "read a long paragraph" — and the whole reason this tool exists is that the
 * previous version under-counted, so a short window costs real minutes.
 */
export const IDLE_SECONDS = 180;

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

/**
 * Nothing accrues while paused or while no Chrome window has focus. A locked
 * screen is unambiguous and always stops accrual; plain "idle" only means no
 * keyboard or mouse for IDLE_SECONDS, so it stops accrual only when the active
 * tab is SILENT — a tab playing sound is being watched, not abandoned, and
 * counting a twenty-minute video as idle is exactly the under-counting this
 * extension was asked to fix.
 * ponytail: a muted video still counts as idle; per-tab media state
 * (mutedInfo plus a real media-playback signal) would be the upgrade.
 */
export const accruing = (state, audible = false) =>
  !state.paused &&
  state.focused !== false &&
  state.idleState !== "locked" &&
  (state.idleState !== "idle" || audible === true);

const addSeconds = (seconds, category, n) =>
  n > 0 ? { ...seconds, [category]: (seconds[category] ?? 0) + n } : seconds;

/**
 * Settles the open segment into the accumulator and re-points the checkpoint at
 * `category`; a missing category or a state that cannot accrue closes it. Pure:
 * every tab, focus, idle and alarm event funnels through this one function.
 */
export function checkpoint(state, category, now, audible = false) {
  const elapsed =
    state.activeCategory && typeof state.since === "number"
      ? Math.min(Math.floor((now - state.since) / 1000), MAX_SEGMENT_SECONDS)
      : 0;
  const open = Boolean(category) && accruing(state, audible);
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
    // chrome.idle's own three-valued state. Anything else — a fresh profile, a
    // key from an older build — reads as "active": the gate errs towards
    // counting, never towards silently losing minutes.
    idleState: raw.idleState === "idle" || raw.idleState === "locked" ? raw.idleState : "active",
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

/**
 * Active tab of the focused window. The Tab object stays a local: `settle` takes
 * a category and a boolean from it and nothing else ever reaches storage.
 */
export const activeTab = async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];

/**
 * Chrome dispatches tab, focus, idle and alarm events independently, so two
 * unserialized load -> settle -> [POST] -> save cycles overlap and the later
 * save silently clobbers the newer state: an idle transition lost to a tab
 * switch, or a tab switch reverted by the auto-send that was still in its round
 * trip. Every entry point below queues here instead, so a late event re-reads
 * the post-send state. ponytail: one global chain, not per-key locks — one
 * service worker, one storage area. The popup is a separate realm and shares no
 * chain; it only writes on a click.
 */
let queue = Promise.resolve();
const serialize = (step) => (queue = queue.then(step, step));

/**
 * The single write path: apply a flag change, settle the elapsed segment,
 * re-point the checkpoint, and roll the UTC day over (sending the finished day
 * first, unless sending is blocked). Call it only from inside `serialize`.
 */
async function settle(patch, now, fetchImpl) {
  const loaded = { ...(await loadState()), ...patch };
  // One query answers both questions the gate asks: which category, and is that
  // tab making sound. `audible` is already on the Tab objects this call returns,
  // so it costs no extra permission.
  const tab = await activeTab();
  const audible = tab?.audible === true;
  const category = accruing(loaded, audible) ? categoryOfTab(tab) : null;
  let state = checkpoint(loaded, category, now, audible);
  const today = todayUtc(new Date(now));
  if (state.periodStart !== today) {
    // The day flips either way — the local accounting must not depend on
    // whether the network attempt was allowed — but a blocked account is not
    // retried by the clock: only a settings change or Şimdi gönder lifts it.
    // ponytail: up to one flush window of post-midnight time lands in the
    // finished day, and a blocked account's finished day is dropped rather than
    // queued. Upgrade path: split the segment at the day boundary and keep one
    // unsent period aside.
    const sent = state.sendBlocked ? state : await deliver(state, await loadSettings(), now, fetchImpl);
    state = startPeriod(sent, today);
  }
  await saveState(state);
  return state;
}

/** Every tab, focus, idle and alarm event funnels through this one serialized write. */
export const update = (patch = {}, now = Date.now(), fetchImpl = fetch) =>
  serialize(() => settle(patch, now, fetchImpl));

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
export const autoSend = (now = Date.now(), fetchImpl = fetch) =>
  serialize(async () => {
    const state = await settle({}, now, fetchImpl);
    const settings = await loadSettings();
    if (!shouldAutoSend(state, settings)) return state;
    const next = await deliver(state, settings, now, fetchImpl);
    await saveState(next);
    return next;
  });

/** "Şimdi gönder": always attempts, lifts the block, never clears the accumulator. */
export const sendNow = (now = Date.now(), fetchImpl = fetch) =>
  serialize(async () => {
    const state = { ...(await settle({}, now, fetchImpl)), sendBlocked: false };
    const next = await deliver(state, await loadSettings(), now, fetchImpl);
    await saveState(next);
    return next;
  });

/** A settings change (new key, new address) lifts the auto-send block. */
export const unblockSending = () =>
  serialize(async () => {
    const state = await loadState();
    if (!state.sendBlocked) return state;
    const next = { ...state, sendBlocked: false };
    await saveState(next);
    return next;
  });

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
