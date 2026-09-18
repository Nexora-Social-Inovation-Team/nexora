/* global chrome */
import { FLUSH_MINUTES, IDLE_SECONDS, SEND_MINUTES, autoSend, unblockSending, update } from "./core.js";

const FLUSH = "nexora-flush";
const SEND = "nexora-send";

/**
 * `idleState` has exactly one writer, chrome.idle.onStateChanged, so a
 * transition the worker never received is permanent: a screen locked while the
 * service worker slept, a browser restart, or an extension reload during a lock
 * all leave "locked" in storage. accruing() then never opens a checkpoint
 * again and the counter is dead until someone clears the extension's data —
 * reported as "Ekran kilitli. Sayım duruyor." on an unlocked screen.
 *
 * Asking chrome.idle what is true right now costs one call. It rides the flush
 * alarm that already runs every minute, so a missed transition heals inside one
 * flush window instead of never.
 */
const settleWithLiveIdle = async () => {
  try {
    await update({ idleState: await chrome.idle.queryState(IDLE_SECONDS) });
  } catch {
    await update(); // no idle API: settle anyway rather than skip the flush
  }
};

const schedule = () => {
  chrome.alarms.create(FLUSH, { periodInMinutes: FLUSH_MINUTES });
  chrome.alarms.create(SEND, { periodInMinutes: SEND_MINUTES });
  chrome.idle.setDetectionInterval(IDLE_SECONDS);
  void settleWithLiveIdle(); // a restart is the likeliest way to miss a transition
};

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);

// Event-driven accounting: each of these settles the elapsed segment first, so a
// tab switch inside a minute credits both categories.
chrome.tabs.onActivated.addListener(() => void update());
chrome.tabs.onUpdated.addListener((_tabId, change) => {
  if (change.url) void update(); // a real navigation; the url itself is never read here
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  void update({ focused: windowId !== chrome.windows.WINDOW_ID_NONE });
});
// chrome's own "active" | "idle" | "locked" is stored verbatim: "locked" always
// stops accrual, plain "idle" only stops it for a silent tab (see accruing()).
chrome.idle.onStateChanged.addListener((state) => void update({ idleState: state }));

// A new token or API address is a fresh chance for a blocked sender.
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") void unblockSending();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH) void settleWithLiveIdle(); // settles elapsed time only, never a flat +1
  if (alarm.name === SEND) void autoSend();
});
