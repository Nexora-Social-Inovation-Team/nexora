/* global chrome */
import { heartbeat } from "./core.js";

const ALARM = "nexora-heartbeat";
const schedule = () => chrome.alarms.create(ALARM, { periodInMinutes: 1 });

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void heartbeat();
});
