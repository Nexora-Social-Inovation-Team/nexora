/* global chrome, document */
import {
  LABELS_TR,
  clearActivity,
  loadState,
  minutesLabelTr,
  saveState,
  sendNow,
  syncLabel,
  update,
} from "./core.js";

const $ = (id) => document.getElementById(id);

function setStatus(text, state) {
  $("status").textContent = text;
  $("status").dataset.state = state;
}

/** Paints what syncLabel() decided; the dot beside it is aria-hidden. */
function setSync(state) {
  const { state: kind, text } = syncLabel(state);
  $("last").dataset.state = kind;
  $("last-text").textContent = text;
}

/** One-shot confirmation on the dot; the class has to leave again to re-fire. */
function flashSync() {
  const row = $("last");
  row.classList.remove("flash");
  void row.offsetWidth; // restart the animation
  row.classList.add("flash");
}

function render(state) {
  const entries = Object.entries(state.seconds).filter(([, seconds]) => seconds > 0);
  const total = entries.reduce((sum, [, seconds]) => sum + seconds, 0);
  $("total").textContent = total > 0 && total < 30 ? "<1" : Math.round(total / 60).toLocaleString("tr-TR");
  $("activity").textContent = state.paused ? "Duraklatıldı" : "Sayım açık";
  $("activity").dataset.paused = String(state.paused);
  const list = $("minutes");
  list.replaceChildren(
    ...entries.map(([category, seconds]) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = LABELS_TR[category] ?? category;
      const value = document.createElement("strong");
      value.textContent = minutesLabelTr(seconds);
      const heading = document.createElement("div");
      heading.className = "category-label";
      heading.append(label, value);
      const track = document.createElement("span");
      track.className = "bar-track";
      track.setAttribute("aria-hidden", "true");
      const bar = document.createElement("span");
      bar.className = "bar-fill";
      bar.style.width = `${(seconds / total) * 100}%`;
      track.append(bar);
      li.append(heading, track);
      return li;
    }),
  );
  list.hidden = entries.length === 0;
  $("pause").textContent = state.paused ? "Devam et" : "Duraklat";
  $("pause").setAttribute("aria-pressed", String(state.paused));

  setSync(state);

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
    $("send").disabled = true;
    $("last").dataset.state = "sending";
    $("last-text").textContent = "Gönderiliyor";
    try {
      const next = await sendNow();
      render(next);
      if (!next.sendBlocked) flashSync();
    } catch {
      setStatus("Özet gönderilemedi. Yeniden dene.", "error");
    } finally {
      $("send").disabled = false;
    }
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
