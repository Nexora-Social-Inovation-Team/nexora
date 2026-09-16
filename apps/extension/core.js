/* global chrome, fetch, URL */
import { categorize } from "./dictionary.js";

export * from "./dictionary.js";

/** The only keys ever written to chrome.storage.local. Settings live in storage.sync. */
export const ACTIVITY_KEYS = ["minutes", "periodStart", "paused"];

export const DEFAULT_API_BASE = "http://localhost:3000";

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

/** One heartbeat minute for `category`. Pure: returns the next state. */
export function tick(state, category) {
  if (state.paused || !category) return state;
  return { ...state, minutes: { ...state.minutes, [category]: (state.minutes[category] ?? 0) + 1 } };
}

/** Starts a fresh accounting period, keeping the paused flag. */
export const clearMinutes = (state, today = todayUtc()) => ({ ...state, minutes: {}, periodStart: today });

/** POST body for /signals/category-summary: a date range and category minutes, nothing else. */
export const buildSummaryBody = (state, today = todayUtc()) => ({
  period: `${state.periodStart}/${today}`,
  minutes: { ...state.minutes },
});

export async function loadState(storage = chrome.storage.local) {
  const raw = (await storage.get(ACTIVITY_KEYS)) ?? {};
  return { minutes: raw.minutes ?? {}, periodStart: raw.periodStart ?? todayUtc(), paused: raw.paused === true };
}

export async function saveState(state, storage = chrome.storage.local) {
  await storage.set({ minutes: state.minutes, periodStart: state.periodStart, paused: state.paused });
}

export async function loadSettings(storage = chrome.storage.sync) {
  const raw = (await storage.get(["apiBase", "token"])) ?? {};
  return { apiBase: raw.apiBase || DEFAULT_API_BASE, token: raw.token || "" };
}

/**
 * ponytail: 1-minute granularity and no idle detection — a minute where the user
 * walked away (or the browser lost focus) still counts, and tab switches inside a
 * minute are lost. Upgrade path: chrome.idle.queryState + timestamp deltas instead
 * of a flat +1 per alarm.
 */
export async function heartbeat() {
  const state = await loadState();
  if (state.paused) return state;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const category = tab ? categoryOfTab(tab) : null;
  if (!category) return state;
  const next = tick(state, category);
  await saveState(next);
  return next;
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
