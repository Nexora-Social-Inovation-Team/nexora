/* global chrome */
import { FLUSH_MINUTES, IDLE_SECONDS, SEND_MINUTES, autoSend, unblockSending, update } from "./core.js";

const FLUSH = "nexora-flush";
const SEND = "nexora-send";

const schedule = () => {
  chrome.alarms.create(FLUSH, { periodInMinutes: FLUSH_MINUTES });
  chrome.alarms.create(SEND, { periodInMinutes: SEND_MINUTES });
  chrome.idle.setDetectionInterval(IDLE_SECONDS);
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
  if (alarm.name === FLUSH) void update(); // settles elapsed time only, never a flat +1
  if (alarm.name === SEND) void autoSend();
});
