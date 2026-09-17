/* global chrome, document */
import { DEFAULT_API_BASE, loadSettings } from "./core.js";

const $ = (id) => document.getElementById(id);
const status = (text, state) => {
  $("status").textContent = text;
  $("status").dataset.state = state;
};

loadSettings().then(
  (settings) => {
    $("apiBase").value = settings.apiBase;
    $("token").value = settings.token;
  },
  () => status("Ayarlar okunamadı.", "error"),
);

$("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiBase = $("apiBase").value.trim() || DEFAULT_API_BASE;
  try {
    await chrome.storage.sync.set({ apiBase, token: $("token").value.trim() });
    status("Kaydedildi.", "ready");
  } catch {
    status("Kaydedilemedi. Yeniden dene.", "error");
  }
});
