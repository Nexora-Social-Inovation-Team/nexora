/* global chrome, document */
import {
  LABELS_TR,
  clearActivity,
  loadState,
  minutesLabelTr,
  saveState,
  sendNow,
  update,
} from "./core.js";

const $ = (id) => document.getElementById(id);

function setStatus(text, state) {
  $("status").textContent = text;
  $("status").dataset.state = state;
}

function render(state) {
  const entries = Object.entries(state.seconds).filter(([, seconds]) => seconds > 0);
  const list = $("minutes");
  list.replaceChildren(
    ...entries.map(([category, seconds]) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = LABELS_TR[category] ?? category;
      const value = document.createElement("strong");
      value.textContent = minutesLabelTr(seconds);
      li.append(label, value);
      return li;
    }),
  );
  list.hidden = entries.length === 0;
  $("pause").textContent = state.paused ? "Devam et" : "Duraklat";

  const sent = state.lastSentAt
    ? `Son gönderim: ${new Date(state.lastSentAt).toLocaleTimeString("tr-TR")}`
    : "Henüz gönderilmedi.";
  $("last").textContent = state.lastStatus ? `${sent} — ${state.lastStatus}` : sent;
  $("last").dataset.state = state.sendBlocked ? "error" : "ok";

  if (entries.length === 0) {
    setStatus("Henüz kategori dakikası yok. Tarayıcıda gezindikçe burada birikir.", "empty");
  } else if (state.paused) {
    setStatus("Duraklatıldı.", "ready");
  } else {
    setStatus(`Sayım sürüyor (${state.periodStart} başlangıçlı).`, "ready");
  }
}

async function main() {
  render(await loadState());

  // An open popup follows the service worker live.
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") void loadState().then(render);
  });

  $("send").addEventListener("click", async () => {
    $("last").textContent = "Gönderiliyor…";
    render(await sendNow());
  });
  $("pause").addEventListener("click", async () => {
    const current = await loadState();
    render(await update({ paused: !current.paused })); // settles first, then stops accruing
  });
  $("clear").addEventListener("click", async () => {
    const cleared = clearActivity(await loadState());
    await saveState(cleared);
    render(cleared);
  });
}

main().catch(() => setStatus("Eklenti verisi okunamadı. Tarayıcıyı yeniden başlat.", "error"));
