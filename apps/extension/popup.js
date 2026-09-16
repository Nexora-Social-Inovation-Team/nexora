/* global document */
import {
  LABELS_TR,
  buildSummaryBody,
  clearMinutes,
  loadSettings,
  loadState,
  resultMessageTr,
  saveState,
  sendSummary,
  todayUtc,
} from "./core.js";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(text, state) {
  statusEl.textContent = text;
  statusEl.dataset.state = state;
}

function render(state) {
  const entries = Object.entries(state.minutes).filter(([, n]) => n > 0);
  const list = $("minutes");
  list.replaceChildren(
    ...entries.map(([category, n]) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = LABELS_TR[category] ?? category;
      const value = document.createElement("strong");
      value.textContent = `${n} dk`;
      li.append(label, value);
      return li;
    }),
  );
  list.hidden = entries.length === 0;
  $("pause").textContent = state.paused ? "Devam et" : "Duraklat";
  if (entries.length === 0) {
    setStatus("Henüz kategori dakikası yok. Tarayıcıda gezindikçe burada birikir.", "empty");
  } else {
    setStatus(state.paused ? "Duraklatıldı." : `Sayım sürüyor (${state.periodStart} başlangıçlı).`, "ready");
  }
}

async function update(next) {
  await saveState(next);
  render(next);
  return next;
}

async function send() {
  const [state, settings] = await Promise.all([loadState(), loadSettings()]);
  const body = buildSummaryBody(state, todayUtc());
  if (!Object.values(body.minutes).some((n) => n > 0)) {
    setStatus("Gönderilecek kategori dakikası yok.", "empty");
    return;
  }
  if (!settings.token) {
    setStatus("Önce ayarlardan oturum anahtarını gir.", "error");
    return;
  }
  setStatus("Gönderiliyor…", "loading");
  let result = null;
  try {
    result = await sendSummary({ ...settings, body });
  } catch {
    result = null; // network/CORS failure: no details are logged
  }
  if (result?.status === 201) {
    await update(clearMinutes(state));
  }
  setStatus(resultMessageTr(result), result?.status === 201 ? "ready" : "error");
}

async function main() {
  const state = await loadState();
  render(state);
  $("send").addEventListener("click", () => void send());
  $("pause").addEventListener("click", async () => {
    const current = await loadState();
    await update({ ...current, paused: !current.paused });
  });
  $("clear").addEventListener("click", async () => {
    await update(clearMinutes(await loadState()));
  });
}

main().catch(() => setStatus("Eklenti verisi okunamadı. Tarayıcıyı yeniden başlat.", "error"));
